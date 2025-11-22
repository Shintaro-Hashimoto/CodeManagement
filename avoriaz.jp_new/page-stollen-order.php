<?php
/*
Template Name: シュトーレン注文フォーム
*/
get_header(); ?>

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
            <option value="ご自宅用" selected>ご自宅用</option>
            <option value="プレゼント用">プレゼント用 (送り主情報を入力)</option>
          </select>
        </div>
      </div>

      <div id="senderSection" class="form-section hidden">
        <h3>送り主情報 (伝票記載用)</h3>
        <p style="font-size:0.9em; color:#666; margin-bottom:20px; background:#f9f9f9; padding:10px; border-radius:4px; border-left: 3px solid var(--color-primary);">
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
        <div id="recipientsContainer"></div>
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
          
          <div id="invoiceNoteContainer" class="hidden" style="margin-top: 15px; background: #f9f9f9; padding: 15px; border-radius: 4px;">
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
        <button type="button" id="checkBtn" class="btn btn-primary">入力内容を確認する</button>
      </div>
      
    </form>
  </div>
</div>

<div id="confirmModal" class="confirm-modal-overlay">
  <div class="confirm-modal-content">
    <div class="confirm-header">ご注文内容の確認</div>
    <div class="confirm-body" id="confirmBody"></div>
    <div class="confirm-footer">
      <button type="button" id="backBtn" class="btn btn-secondary" style="min-width:150px;">修正する</button>
      <button type="button" id="finalSubmitBtn" class="btn btn-primary" style="min-width:200px;">この内容で注文する</button>
    </div>
    <div id="finalLoadingMessage" style="text-align:center; padding:10px; color:var(--color-primary); font-weight:bold; display:none;">
      送信中です...
    </div>
  </div>
</div>

<script>
  const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbxeWW56JkQa_ucSA7y8atHhWU3QM59HEnRipMnyLEJjeAv7qj9-NloPC4QHUhfKX1Mt/exec'; 
</script>

<script src="<?php echo get_stylesheet_directory_uri(); ?>/js/stollen-order.js?v=<?php echo time(); ?>"></script>

<?php get_footer(); ?>