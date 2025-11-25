// ★重要: スクリプトの二重読み込み防止ガード
if (window.stollenOrderScriptLoaded) {
  console.log("stollen-order.js already loaded. Skipping.");
  // 既に読み込み済みの場合は、以降の処理を中断して終了
  // (returnだけだと構文エラーになる場合があるため、即時関数で囲むか、例外を投げるか、
  // 単純に以降を else で囲むのが安全ですが、ここでは addEventListener の重複を防ぐフラグ管理で対応します)
} else {
  window.stollenOrderScriptLoaded = true;

  document.addEventListener('DOMContentLoaded', function() {
    // GAS_API_URL は PHPファイル側で定義された定数を使用します

    const form = document.getElementById('breadOrderForm');
    const container = document.getElementById('recipientsContainer');
    const addBtn = document.getElementById('addRecipientBtn');
    const purposeSelect = document.getElementById('orderPurpose');
    const senderSection = document.getElementById('senderSection');
    const invoiceSelect = document.getElementById('invoiceOption');
    const invoiceNoteContainer = document.getElementById('invoiceNoteContainer');
    const senderRequiredInputs = senderSection.querySelectorAll('.sender-input');
    
    const checkBtn = document.getElementById('checkBtn');
    const confirmModal = document.getElementById('confirmModal');
    const confirmBody = document.getElementById('confirmBody');
    const backBtn = document.getElementById('backBtn');
    const finalSubmitBtn = document.getElementById('finalSubmitBtn');
    const finalLoadingMsg = document.getElementById('finalLoadingMessage');

    // 送信中フラグ (連打防止)
    let isSubmitting = false;

    // お届け先テンプレート生成関数
    function getRecipientTemplate(uniqueId) {
      return `
      <div class="recipient-item">
        <div class="recipient-header">
          <h4>お届け先 <span class="recipient-number"></span></h4>
          <button type="button" class="btn btn-danger remove-recipient">削除</button>
        </div>

        <div class="form-group" style="background:#fff; padding:10px; border:1px solid #eee; border-radius:4px;">
          <label style="margin-bottom:5px;">お届け先タイプ</label>
          <label style="margin-right:15px; cursor:pointer;">
            <input type="radio" name="r_type_${uniqueId}" value="individual" class="r-type-radio" checked> 個人宅
          </label>
          <label style="cursor:pointer;">
            <input type="radio" name="r_type_${uniqueId}" value="company" class="r-type-radio"> 会社・法人
          </label>
        </div>

        <div class="company-info-section hidden">
          <div class="form-group">
            <label>会社名 <span class="required-mark">*</span></label>
            <input type="text" class="form-control r-company" placeholder="例: 株式会社アボリア">
          </div>
          <div class="form-group">
            <label>部署名 <span style="font-weight:normal; font-size:0.85em; color:#666;">(任意)</span></label>
            <input type="text" class="form-control r-department" placeholder="例: 総務部">
          </div>
        </div>

        <div class="form-group">
          <label>お名前 <span class="required-mark">*</span></label>
          <input type="text" class="form-control r-name" required>
        </div>
        <div class="form-group">
          <label>郵便番号 <span class="required-mark">*</span></label>
          <input type="text" class="form-control r-postal" placeholder="例: 123-4567" required>
        </div>
        <div class="form-group">
          <label>住所 <span class="required-mark">*</span></label>
          <input type="text" class="form-control r-address" required>
        </div>
        <div class="form-group">
          <label>建物名</label>
          <input type="text" class="form-control r-building">
        </div>
        <div class="form-group">
          <label>電話番号 <span class="required-mark">*</span></label>
          <input type="tel" class="form-control r-phone" required>
        </div>
        <div class="form-group">
          <label>個数 <span class="required-mark">*</span></label>
          <select class="form-control r-quantity">
            <option value="1">1個</option>
            <option value="2">2個</option>
            <option value="3">3個</option>
            <option value="4">4個</option>
            <option value="5">5個</option>
            <option value="6">6個</option>
            <option value="7">7個</option>
            <option value="8">8個</option>
            <option value="9">9個</option>
            <option value="10">10個以上 (備考欄にご記入ください)</option>
          </select>
        </div>
      </div>
      `;
    }

    // 番号振り直し
    function updateRecipientNumbers() {
      const items = container.querySelectorAll('.recipient-item');
      items.forEach((item, index) => {
        const numSpan = item.querySelector('.recipient-number');
        if(numSpan) numSpan.textContent = (index + 1);
      });
    }

    // 追加処理
    function addRecipient() {
      const uniqueId = Date.now() + Math.random().toString(36).substr(2, 9);
      container.insertAdjacentHTML('beforeend', getRecipientTemplate(uniqueId));
      updateRecipientNumbers();
    }

    // 初期実行 (重複チェック: 既に要素がある場合は追加しない)
    if (container.children.length === 0) {
      addRecipient();
    }

    if(addBtn) {
        addBtn.addEventListener('click', addRecipient);
    }

    // クリックイベント (削除 & ラジオボタン)
    container.addEventListener('click', function(e) {
      if (e.target.classList.contains('remove-recipient')) {
        if (container.children.length > 1) {
          if(confirm('このお届け先を削除しますか？')) {
            e.target.closest('.recipient-item').remove();
            updateRecipientNumbers();
          }
        } else {
          alert('お届け先は最低1件必要です。');
        }
      }
    });

    // ラジオボタン変更 (会社情報の表示切替)
    container.addEventListener('change', function(e) {
      if (e.target.classList.contains('r-type-radio')) {
        const parentItem = e.target.closest('.recipient-item');
        const companySection = parentItem.querySelector('.company-info-section');
        const companyInput = parentItem.querySelector('.r-company');

        if (e.target.value === 'company') {
          companySection.classList.remove('hidden');
          companyInput.required = true;
        } else {
          companySection.classList.add('hidden');
          companyInput.required = false;
          companyInput.value = '';
          parentItem.querySelector('.r-department').value = '';
        }
      }
    });

    // 住所自動入力 (zipcloud)
    async function fetchAddress(zip, addressField) {
      const cleanZip = zip.replace(/[^\d]/g, '');
      if (cleanZip.length !== 7) return;

      try {
        const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanZip}`);
        const data = await response.json();
        if (data.results) {
          const result = data.results[0];
          addressField.value = result.address1 + result.address2 + result.address3;
        }
      } catch (error) {
        console.error('Address fetch error:', error);
      }
    }

    // 送り主郵便番号イベント
    const senderPostal = document.querySelector('input[name="sender_postal"]');
    const senderAddress = document.querySelector('input[name="sender_address"]');
    if(senderPostal){
        senderPostal.addEventListener('input', function(e) {
          fetchAddress(e.target.value, senderAddress);
        });
    }

    // お届け先郵便番号イベント (動的)
    container.addEventListener('input', function(e) {
      if (e.target.classList.contains('r-postal')) {
        const parentItem = e.target.closest('.recipient-item');
        const addressField = parentItem.querySelector('.r-address');
        fetchAddress(e.target.value, addressField);
      }
    });

    // 注文目的切り替え
    function toggleSenderRequired() {
      const isPresent = purposeSelect.value === 'プレゼント用';
      if (isPresent) {
        senderSection.classList.remove('hidden');
        senderRequiredInputs.forEach(input => input.required = true);
      } else {
        senderSection.classList.add('hidden');
        senderRequiredInputs.forEach(input => input.required = false);
      }
    }
    
    if(purposeSelect){
        toggleSenderRequired();
        purposeSelect.addEventListener('change', toggleSenderRequired);
    }

    // 請求書切り替え
    function toggleInvoiceNote() {
      if (invoiceSelect.value === 'その他') {
        invoiceNoteContainer.classList.remove('hidden');
      } else {
        invoiceNoteContainer.classList.add('hidden');
      }
    }
    
    if(invoiceSelect){
        toggleInvoiceNote();
        invoiceSelect.addEventListener('change', toggleInvoiceNote);
    }

    // 確認画面表示
    if(checkBtn){
        checkBtn.addEventListener('click', function() {
          if (!form.reportValidity()) return;

          const formData = new FormData(form);
          const purpose = formData.get('order_purpose');
          let recipientsHtml = '';
          let totalQty = 0;
          
          document.querySelectorAll('.recipient-item').forEach((item, index) => {
            const name = item.querySelector('.r-name').value;
            const company = item.querySelector('.r-company').value;
            const department = item.querySelector('.r-department').value;
            const postal = item.querySelector('.r-postal').value;
            const address = item.querySelector('.r-address').value;
            const building = item.querySelector('.r-building').value;
            const phone = item.querySelector('.r-phone').value;
            const qty = parseInt(item.querySelector('.r-quantity').value);
            
            totalQty += qty;
            
            let companyHtml = '';
            if(company || department) {
                companyHtml = `${company} ${department}<br>`;
            }

            recipientsHtml += `
              <div style="margin-bottom:15px; padding-bottom:15px; border-bottom:1px dashed #ccc;">
                <strong>[お届け先 ${index + 1}]</strong><br>
                ${companyHtml}
                ${name} 様 (${qty}個)<br>
                〒${postal} ${address} ${building}<br>
                Tel: ${phone}
              </div>
            `;
          });

          let senderHtml = '';
          if (purpose === 'プレゼント用') {
            senderHtml = `
              <div class="confirm-sub-title">送り主</div>
              <table class="confirm-table">
                <tr><th>お名前</th><td>${formData.get('sender_name')}</td></tr>
                <tr><th>住所</th><td>〒${formData.get('sender_postal')}<br>${formData.get('sender_address')} ${formData.get('sender_building')}</td></tr>
                <tr><th>電話番号</th><td>${formData.get('sender_phone')}</td></tr>
              </table>
            `;
          } else {
            senderHtml = `<div class="confirm-sub-title">送り主</div><p>パン工房MARIKO (店舗より発送)</p>`;
          }

          let invoiceInfo = formData.get('invoice_option');
          if (invoiceInfo === 'その他' && formData.get('invoice_note')) {
            invoiceInfo += ` (${formData.get('invoice_note')})`;
          }

          confirmBody.innerHTML = `
            <div class="confirm-sub-title">ご注文者</div>
            <table class="confirm-table">
              <tr><th>お名前</th><td>${formData.get('orderer_name')}</td></tr>
              <tr><th>Email</th><td>${formData.get('orderer_email')}</td></tr>
              <tr><th>電話番号</th><td>${formData.get('orderer_phone')}</td></tr>
            </table>
            ${senderHtml}
            <div class="confirm-sub-title">お届け先 (合計 ${totalQty}個)</div>
            <div style="background:#f9f9f9; padding:15px; border-radius:4px; border:1px solid #eee;">
              ${recipientsHtml}
            </div>
            <div class="confirm-sub-title">その他</div>
            <table class="confirm-table">
              <tr><th>お届け希望日</th><td>${formData.get('delivery_date') || '指定なし'}</td></tr>
              <tr><th>請求書</th><td>${invoiceInfo}</td></tr>
              <tr><th>備考</th><td>${formData.get('notes') ? formData.get('notes').replace(/\n/g, '<br>') : 'なし'}</td></tr>
            </table>
          `;

          confirmModal.classList.add('active');
        });
    }

    if(backBtn){
        backBtn.addEventListener('click', function() {
          confirmModal.classList.remove('active');
        });
    }

    // -------------------------------------------------------
    // ★ 最終送信処理 (連打防止機能付き)
    // -------------------------------------------------------
    if(finalSubmitBtn){
        finalSubmitBtn.addEventListener('click', function() {
          // 既に送信中なら処理を中断 (クライアントサイドのガード)
          if (isSubmitting) {
            console.log("Sending in progress. Blocked double submission.");
            return; 
          }
          
          isSubmitting = true; // フラグを立てる
          finalSubmitBtn.disabled = true;
          backBtn.disabled = true;
          finalLoadingMsg.style.display = 'block';

          const formData = new FormData(form);
          const data = {
            orderer_name: formData.get('orderer_name'),
            orderer_email: formData.get('orderer_email'),
            orderer_phone: formData.get('orderer_phone'),
            order_purpose: formData.get('order_purpose'),
            delivery_date: formData.get('delivery_date'),
            invoice_option: formData.get('invoice_option'),
            invoice_option_detail: formData.get('invoice_note'),
            notes: formData.get('notes'),
            sender_name: formData.get('sender_name'),
            sender_postal: formData.get('sender_postal'),
            sender_address: formData.get('sender_address'),
            sender_building: formData.get('sender_building'),
            sender_phone: formData.get('sender_phone'),
            recipients: []
          };

          let totalQuantity = 0;
          document.querySelectorAll('.recipient-item').forEach(item => {
            const qty = parseInt(item.querySelector('.r-quantity').value);
            totalQuantity += qty;
            
            const rTypeRadio = item.querySelector('.r-type-radio:checked');
            const isCompany = rTypeRadio && rTypeRadio.value === 'company';

            data.recipients.push({
              name: item.querySelector('.r-name').value,
              company: isCompany ? item.querySelector('.r-company').value : '',
              department: isCompany ? item.querySelector('.r-department').value : '',
              postal: item.querySelector('.r-postal').value,
              address: item.querySelector('.r-address').value,
              building: item.querySelector('.r-building').value,
              phone: item.querySelector('.r-phone').value,
              quantity: qty
            });
          });
          data.total_quantity = totalQuantity;

          fetch(GAS_API_URL, {
            method: 'POST',
            body: JSON.stringify(data)
          })
          .then(response => response.json())
          .then(json => {
            if (json.result === 'success') {
              // 通常成功
              alert('ご注文ありがとうございます！\n注文が確定しました。');
              form.reset();
              toggleSenderRequired();
              toggleInvoiceNote();
              confirmModal.classList.remove('active');
              window.scrollTo({ top: 0, behavior: 'smooth' });
              container.innerHTML = '';
              addRecipient();
            } else if (json.result === 'success' && json.orderId === 'DUPLICATE_SKIP') {
              // GAS側で二重送信と判定された場合も成功として振る舞う
              console.log("Double submission detected by server. Handled gracefully.");
              alert('ご注文ありがとうございます！\n注文が確定しました。');
              form.reset();
              toggleSenderRequired();
              toggleInvoiceNote();
              confirmModal.classList.remove('active');
              window.scrollTo({ top: 0, behavior: 'smooth' });
              container.innerHTML = '';
              addRecipient();
            } else {
              alert('エラーが発生しました: ' + json.error);
            }
          })
          .catch(err => {
            console.error(err);
            alert('送信に失敗しました。通信環境をご確認ください。');
          })
          .finally(() => {
            finalSubmitBtn.disabled = false;
            backBtn.disabled = false;
            finalLoadingMsg.style.display = 'none';
            isSubmitting = false; // フラグ解除
          });
        });
    }
  });
}