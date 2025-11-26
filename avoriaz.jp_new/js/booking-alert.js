document.addEventListener('DOMContentLoaded', function() {

    // ============================================================
    // 夏季特別規定アラート & 送信確認
    // ============================================================
    
    // --- 設定 ---
    const checkinInputName = 'checkin-date'; // チェックイン日のname属性
    
    // フォーム要素の取得
    const dateInput = document.querySelector(`input[name="${checkinInputName}"]`);
    const submitBtn = document.querySelector('.wpcf7-submit');

    // 日付入力欄がないページ（サウナやキャンプの一部など）ではここで終了
    if (!dateInput || !submitBtn) return;

    // --- 警告メッセージ要素の作成 (最初は非表示) ---
    const alertBox = document.createElement('div');
    alertBox.className = 'summer-policy-alert';
    alertBox.style.display = 'none';
    alertBox.innerHTML = `
        <strong>【重要】夏季期間の特別規定</strong><br>
        選択された日程は「夏季特別期間（海の日〜8/31）」に含まれます。<br>
        <ul style="margin:5px 0 5px 20px; text-align:left;">
            <li>ご予約時点で<strong>キャンセル補償（宿泊料金の10％）</strong>が発生いたします。</li>
            <li>仮予約は固くお断りしております。</li>
            <li>8月は通常料金と異なります。</li>
        </ul>
        <span style="color:red; font-weight:bold;">上記に同意の上、ご予約ください。</span>
    `;
    
    // 日付入力欄の直後に挿入
    if (dateInput.parentNode) {
        dateInput.parentNode.insertBefore(alertBox, dateInput.nextSibling);
    }

    // --- 海の日 (7月の第3月曜日) を計算する関数 ---
    function getMarineDay(year) {
        const firstDay = new Date(year, 6, 1); // 7月1日 (月は0始まり)
        const dayOfWeek = firstDay.getDay(); // 0:日, 1:月 ...
        
        // 第1月曜日を計算
        let firstMondayDate = 1;
        if (dayOfWeek === 1) {
            firstMondayDate = 1;
        } else if (dayOfWeek === 0) {
            firstMondayDate = 2;
        } else {
            firstMondayDate = 9 - dayOfWeek;
        }
        
        // 第3月曜日 = 第1月曜日 + 14日
        return new Date(year, 6, firstMondayDate + 14);
    }

    // --- 期間チェック関数 ---
    function isSummerSeason(dateString) {
        if (!dateString) return false;
        const date = new Date(dateString);
        const year = date.getFullYear();
        
        // 海の日 (開始)
        const start = getMarineDay(year);
        // 8月31日 (終了)
        const end = new Date(year, 7, 31); // 8月は7

        // 時間をリセットして比較
        date.setHours(0,0,0,0);
        start.setHours(0,0,0,0);
        end.setHours(0,0,0,0);

        return date >= start && date <= end;
    }

    // --- イベント1: 日付変更時に警告を表示 ---
    dateInput.addEventListener('change', function() {
        if (isSummerSeason(this.value)) {
            alertBox.style.display = 'block';
        } else {
            alertBox.style.display = 'none';
        }
    });

    // --- イベント2: 送信ボタン押下時に確認 ---
    // CF7の送信イベントをキャッチするのではなく、ボタンクリックをフックする
    submitBtn.addEventListener('click', function(e) {
        if (isSummerSeason(dateInput.value)) {
            const confirmMsg = 
                "【重要確認】\n" +
                "選択された日程は「夏季特別期間」です。\n" +
                "予約確定の時点でキャンセル料（10%）の対象となります。\n\n" +
                "このまま予約を申し込みますか？";

            if (!confirm(confirmMsg)) {
                e.preventDefault(); // 送信キャンセル
                e.stopPropagation(); // イベント伝播も止める
                return false;
            }
        }
    });
    
    // ページ読み込み時にも日付が入っていればチェック (ブラウザバックや再読み込み時など)
    if (dateInput.value && isSummerSeason(dateInput.value)) {
        alertBox.style.display = 'block';
    }
});