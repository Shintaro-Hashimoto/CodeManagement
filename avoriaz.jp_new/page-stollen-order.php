<?php
/*
Template Name: シュトーレン注文フォーム
*/
get_header(); ?>

<style>
  /* =========================================
     デザイン設定 (予約カレンダーと統一)
     ========================================= */
  :root {
      --form-primary: #4a90e2;       /* メインカラー（青） */
      --form-primary-hover: #267dff; /* ホバー時の色 */
      --form-bg-light: #f9f9f9;      /* 薄い背景色 */
      --form-bg-accent: #e3f2fd;     /* アクセント背景（薄い青） */
      --form-border: #e0e0e0;        /* 枠線の色 */
      --form-text: #333;             /* テキスト色 */
      --form-danger: #ff5252;        /* 削除ボタン等の色 */
  }

  /* ページ全体のラッパー */
  .order-form-wrapper { 
      padding: 40px 0; 
      background-color: #fff; 
  }

  /* フォームコンテナ */
  .order-form-container { 
      max-width: 800px; 
      margin: 0 auto; 
      padding: 40px; 
      background: #fff; 
      border: 1px solid var(--form-border); 
      border-radius: 8px; 
      box-shadow: 0 4px 12px rgba(0,0,0,0.05); 
      font-family: "Helvetica Neue", Arial, sans-serif;
  }
  
  h2.form-title {
      text-align: center;
      margin-bottom: 40px;
      color: var(--form-text);
      font-size: 1.8rem;
      letter-spacing: 0.05em;
  }

  /* セクション区切り */
  .form-section { 
      margin-bottom: 40px; 
  }
  
  /* 見出しデザイン */
  .form-section h3 { 
      margin-top: 0; 
      color: var(--form-text); 
      font-size: 1.3rem; 
      border-left: 5px solid var(--form-primary); 
      padding-left: 15px; 
      margin-bottom: 25px; 
      line-height: 1.4;
  }
  
  /* 入力エリア */
  .form-group { margin-bottom: 20px; }
  .form-group label { 
      display: block; 
      margin-bottom: 8px; 
      font-weight: bold; 
      color: #555; 
      font-size: 0.95rem;
  }
  .required-mark { color: var(--form-danger); margin-left: 4px; }
  
  .form-control { 
      width: 100%; 
      padding: 12px 15px; 
      border: 1px solid #ccc; 
      border-radius: 4px; 
      font-size: 16px; 
      box-sizing: border-box; 
      transition: border-color 0.3s, box-shadow 0.3s;
  }
  
  .form-control:focus { 
      border-color: var(--form-primary); 
      outline: none; 
      box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.2); 
  }
  
  /* お届け先アイテム */
  .recipient-item { 
      background: var(--form-bg-light); 
      padding: 25px; 
      border-radius: 8px; 
      margin-bottom: 25px; 
      border: 1px solid var(--form-border); 
      position: relative; 
  }
  .recipient-item + .recipient-item {
      margin-top: 30px;
  }

  .recipient-header { 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      margin-bottom: 20px; 
      border-bottom: 1px solid #ddd;
      padding-bottom: 10px;
  }
  .recipient-header h4 { 
      margin: 0; 
      font-size: 1.1rem; 
      color: var(--form-primary); 
      font-weight: bold;
  }
  
  /* ボタン共通スタイル */
  .btn { 
      display: inline-block; 
      padding: 12px 30px; 
      border: none; 
      border-radius: 30px; 
      cursor: pointer; 
      font-size: 16px; 
      text-align: center; 
      font-weight: bold;
      transition: all 0.3s; 
      line-height: 1.5;
  }
  
  .btn-primary { 
      background-color: var(--form-primary); 
      color: #fff; 
      width: 100%; 
      max-width: 320px; 
      box-shadow: 0 4px 6px rgba(74, 144, 226, 0.3);
  }
  .btn-primary:hover { 
      background-color: var(--form-primary-hover); 
      transform: translateY(-2px); 
      box-shadow: 0 6px 8px rgba(74, 144, 226, 0.4);
  }
  
  .btn-secondary { 
      background-color: #fff; 
      color: var(--form-primary); 
      border: 2px solid var(--form-primary); 
  }
  .btn-secondary:hover { 
      background-color: var(--form-bg-accent); 
  }
  
  .btn-danger { 
      background-color: #fff; 
      color: var(--form-danger); 
      border: 1px solid var(--form-danger);
      font-size: 14px; 
      padding: 6px 16px; 
      border-radius: 20px;
  }
  .btn-danger:hover { 
      background-color: #fff5f5; 
  }
  
  .hidden { display: none; }
  #loading-message { text-align: center; display: none; margin-top: 20px; color: var(--form-primary); font-weight: bold; }

  @media (max-width: 600px) {
    .order-form-container { padding: 20px; border: none; box-shadow: none; }
    .btn { width: 100%; }
  }
</style>

<div class="order-form-wrapper">
  <div class="order-form-container">
    <h2 class="form-title">シュトーレン ご注文フォーム</h2>
    
    <form id="breadOrderForm">
      
      <div class="form-section">
        <h3>ご注文者情報</h3>
        <div class="form-group">
          <label>お名前 <span class="required-mark">*</span></label>
          <input type="text" name="orderer_name" class="form-control" placeholder="例: 山田 太郎" required>
        </div>
        <div class="form-group">
          <label>メールアドレス <span class="required-mark">*</span></label>
          <input type="email" name="orderer_email" class="form-control" placeholder="例: info@example.com" required>
        </div>
        <div class="form-group">
          <label>電話番号 <span class="required-mark">*</span></label>
          <input type="tel" name="orderer_phone" class="form-control" placeholder="例: 090-1234-5678" required>
        </div>
        
        <div class="form-group">
          <label>注文目的</label>
          <select name="order_purpose" id="orderPurpose" class="form-control">
            <option value="ご自宅用">ご自宅用</option>
            <option value="プレゼント用">プレゼント用 (送り主情報を入力)</option>
          </select>
        </div>
      </div>

      <div id="senderSection" class="form-section hidden">
        <h3>送り主情報 (伝票記載用)</h3>
        <p style="font-size:0.9em; color:#666; margin-bottom:20px; background:var(--form-bg-accent); padding:10px; border-radius:4px;">
          ※「プレゼント用」を選択された場合、配送伝票の「ご依頼主」欄にはこちらの情報が記載されます。
        </p>
        <div class="form-group">
          <label>お名前 <span class="required-mark">*</span></label>
          <input type="text" name="sender_name" class="form-control sender-input">
        </div>
        <div class="form-group">
          <label>郵便番号 <span class="required-mark">*</span></label>
          <input type="text" name="sender_postal" class="form-control sender-input" placeholder="例: 123-4567">
        </div>
        <div class="form-group">
          <label>住所 <span class="required-mark">*</span></label>
          <input type="text" name="sender_address" class="form-control sender-input">
        </div>
        <div class="form-group">
          <label>建物名</label>
          <input type="text" name="sender_building" class="form-control">
        </div>
        <div class="form-group">
          <label>電話番号 <span class="required-mark">*</span></label>
          <input type="tel" name="sender_phone" class="form-control sender-input">
        </div>
      </div>

      <div class="form-section">
        <h3>お届け先</h3>
        <div id="recipientsContainer">
          </div>
        <div style="text-align: center; margin-top: 20px;">
          <button type="button" id="addRecipientBtn" class="btn btn-secondary">＋ お届け先を追加する</button>
        </div>
      </div>

      <div class="form-section">
        <h3>配送・その他</h3>
        <div class="form-group">
          <label>お届け希望日</label>
          <input type="date" name="delivery_date" class="form-control">
        </div>
        
        <div class="form-group">
          <label>請求書送付</label>
          <select name="invoice_option" id="invoiceOption" class="form-control">
            <option value="商品に同梱">商品に同梱</option>
            <option value="ご注文者に送付（メール）">ご注文者に送付（メール）</option>
            <option value="その他">その他</option>
          </select>
          
          <div id="invoiceNoteContainer" class="hidden" style="margin-top: 15px; background: var(--form-bg-light); padding: 15px; border-radius: 4px;">
              <label style="font-size: 0.9em;">ご請求書について</label>
              <input type="text" name="invoice_note" class="form-control" placeholder="例: 宛名を「株式会社〇〇」で発行希望、など">
          </div>
        </div>

        <div class="form-group">
          <label>備考</label>
          <textarea name="notes" class="form-control" rows="4" placeholder="ご質問や、10個以上の大口注文のご相談など、ご自由にご記入ください"></textarea>
        </div>
      </div>

      <div style="text-align: center; margin-top: 50px;">
        <button type="submit" class="btn btn-primary">注文を確定する</button>
      </div>
      <p id="loading-message">送信中です... そのままお待ちください</p>

    </form>
  </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
  // GAS Web App URL
  const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbxeWW56JkQa_ucSA7y8atHhWU3QM59HEnRipMnyLEJjeAv7qj9-NloPC4QHUhfKX1Mt/exec'; 

  const container = document.getElementById('recipientsContainer');
  const addBtn = document.getElementById('addRecipientBtn');
  const purposeSelect = document.getElementById('orderPurpose');
  const senderSection = document.getElementById('senderSection');
  const invoiceSelect = document.getElementById('invoiceOption');
  const invoiceNoteContainer = document.getElementById('invoiceNoteContainer');

  // ★追加: 送り主の必須項目
  const senderRequiredInputs = senderSection.querySelectorAll('.sender-input');

  // お届け先テンプレート (郵便番号を必須化)
  const recipientHtmlTemplate = `
    <div class="recipient-item">
      <div class="recipient-header">
        <h4>お届け先 <span class="recipient-number"></span></h4>
        <button type="button" class="btn btn-danger remove-recipient">削除</button>
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

  function updateRecipientNumbers() {
    const items = container.querySelectorAll('.recipient-item');
    items.forEach((item, index) => {
      const numSpan = item.querySelector('.recipient-number');
      if(numSpan) numSpan.textContent = (index + 1);
    });
  }

  function addRecipient() {
    container.insertAdjacentHTML('beforeend', recipientHtmlTemplate);
    updateRecipientNumbers();
  }

  addRecipient();

  if(addBtn) {
      addBtn.addEventListener('click', addRecipient);
  }

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

  // 注文目的の表示切替 & 必須属性制御
  function toggleSenderRequired(isPresent) {
    if (isPresent) {
      senderSection.classList.remove('hidden');
      senderRequiredInputs.forEach(input => input.required = true);
    } else {
      senderSection.classList.add('hidden');
      senderRequiredInputs.forEach(input => input.required = false);
    }
  }

  purposeSelect.addEventListener('change', function() {
    toggleSenderRequired(this.value === 'プレゼント用');
  });

  invoiceSelect.addEventListener('change', function() {
    if (this.value === 'その他') {
      invoiceNoteContainer.classList.remove('hidden');
    } else {
      invoiceNoteContainer.classList.add('hidden');
    }
  });

  document.getElementById('breadOrderForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const submitBtn = this.querySelector('button[type="submit"]');
    const loadingMsg = document.getElementById('loading-message');
    
    submitBtn.disabled = true;
    submitBtn.innerText = '送信中...'; 
    loadingMsg.style.display = 'block';

    const formData = new FormData(this);
    
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
      
      data.recipients.push({
        name: item.querySelector('.r-name').value,
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
        alert('ご注文ありがとうございます！\n注文が確定しました。');
        document.getElementById('breadOrderForm').reset();
        
        toggleSenderRequired(false);
        invoiceNoteContainer.classList.add('hidden');
        
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
      submitBtn.disabled = false;
      submitBtn.innerText = '注文を確定する';
      loadingMsg.style.display = 'none';
    });
  });
});
</script>

<?php get_footer(); ?>