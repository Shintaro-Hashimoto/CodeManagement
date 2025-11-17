<?php
/**
 * Template Name: 宿泊カレンダーページ
 * Description: Google Sheetsから取得した宿泊在庫状況を表示するカレンダー
 */

$inventoryKey = 'stay'; 

get_header(); 

// ==========================================================
// 1. キャッシュデータの読み込み関数
// ==========================================================
function get_cached_inventory() {
    $cached_data = get_option( 'cached_inventory_status' );
    if ( $cached_data ) {
        return json_decode( $cached_data, true ); 
    }
    return [];
}

// 制限日を取得する関数 (09_Calendar_Settingsと連携)
function get_limit_date($key) {
    $cached_settings = get_option( 'cached_calendar_settings' );
    if ( $cached_settings ) {
        $settings = json_decode( $cached_settings, true );
        return isset($settings[$key]) ? $settings[$key] : '2026/03/31'; 
    }
    return '2026/03/31'; 
}

$inventory = get_cached_inventory();
$js_inventory = !empty($inventory) ? json_encode($inventory) : '{}'; 
$last_update_time = get_option( 'cached_inventory_status_time', time() );

// 制限日をAppSheet（のキャッシュ）から取得
$limitEndDate = get_limit_date($inventoryKey);
?>

<div id="primary" class="content-area">
    <main id="main" class="site-main">
        <h1>お部屋 空き状況</h1>
        <div class="inventory-calendar-container">
            <div id="calendar-header">
                <button id="prev-month">◀ 前月</button>
                <h2 id="current-month-year"></h2>
                <button id="next-month">翌月 ▶</button>
            </div>
            
            <div id="calendar-grid">
                <div class="day-header">日</div>
                <div class="day-header">月</div>
                <div class="day-header">火</div>
                <div class="day-header">水</div>
                <div class="day-header">木</div>
                <div class="day-header">金</div>
                <div class="day-header">土</div>
            </div>
        </div>

        <?php
        // 宿泊予約フォームID: 23db074
        echo '<h2 style="margin-top: 40px; border-bottom: 2px solid #ccc; padding-bottom: 5px;">宿泊予約フォーム</h2>';
        echo do_shortcode('[contact-form-7 id="23db074" title="宿泊予約"]'); 
        ?>
        
    </main>
</div>

<script>
    // ==========================================================
    // 2. 在庫データとJavaScript変数
    // ==========================================================
    const inventoryKey = '<?php echo $inventoryKey; ?>'; 
    const INVENTORY_STATUS = <?php echo $js_inventory; ?>;
    
    // PHPから取得した制限日を文字列として保持
    const VIEW_LIMIT_END_DATE_STRING = '<?php echo $limitEndDate; ?>';

    const TODAY = new Date();
    TODAY.setHours(0, 0, 0, 0); 
    
    let currentMonth = TODAY.getMonth();
    let currentYear = TODAY.getFullYear();
    
    const DAYS_CONTAINER = document.getElementById('calendar-grid'); 
    const MONTH_YEAR_HEADER = document.getElementById('current-month-year');
    const PREV_BUTTON = document.getElementById('prev-month');
    const NEXT_BUTTON = document.getElementById('next-month');
    
    // ==========================================================
    // 3. カレンダー描画関数 (制限日チェックを文字列比較に修正)
    // ==========================================================
    function renderCalendar() {
        // 曜日のヘッダー（7個）を残して日付セルを全てクリア
        let dayHeaders = DAYS_CONTAINER.querySelectorAll('.day-header');
        for (let i = DAYS_CONTAINER.children.length - 1; i >= dayHeaders.length; i--) {
            DAYS_CONTAINER.removeChild(DAYS_CONTAINER.children[i]);
        }
        
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
        const startDayOfWeek = firstDayOfMonth.getDay(); 
        const daysInMonth = lastDayOfMonth.getDate();
        
        MONTH_YEAR_HEADER.textContent = `${currentYear}年 ${currentMonth + 1}月`;
        
        // ------------------------------------------------------
        // ナビゲーションボタンの制限
        // ------------------------------------------------------
        const firstDayOfCurrentMonth = new Date(currentYear, currentMonth, 1);
        if (firstDayOfCurrentMonth.getTime() <= TODAY.getTime()) {
            PREV_BUTTON.disabled = true;
        } else {
            PREV_BUTTON.disabled = false;
        }
        
        // 次の月が制限日文字列を超えていないかチェック
        const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
        const nextMonth = currentMonth === 11 ? 1 : currentMonth + 2; // 月は1から12で計算
        const nextMonthString = `${nextMonthYear}/${String(nextMonth).padStart(2, '0')}/01`;
        
        if (nextMonthString > VIEW_LIMIT_END_DATE_STRING) {
            NEXT_BUTTON.disabled = true;
        } else {
            NEXT_BUTTON.disabled = false;
        }
        // ------------------------------------------------------
        
        // 1. 月の開始位置までの空白セルを追加
        for (let i = 0; i < startDayOfWeek; i++) {
            DAYS_CONTAINER.innerHTML += '<div class="calendar-day empty-day"></div>';
        }

        // 2. 日付セルと在庫状況を追加
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentYear, currentMonth, day);
            date.setHours(0, 0, 0, 0); 
            
            const dateString = `${currentYear}/${String(currentMonth + 1).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
            
            // ★ 日付文字列で制限日と比較
            if (dateString > VIEW_LIMIT_END_DATE_STRING) {
                DAYS_CONTAINER.innerHTML += '<div class="calendar-day empty-day"></div>'; 
                continue; 
            }

            const statusData = INVENTORY_STATUS[dateString];
            const currentStatus = statusData ? statusData[inventoryKey] : ''; 

            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.setAttribute('data-date', dateString);
            dayElement.innerHTML = `<span class="day-number">${day}</span>`;
            
            // 過去の日付（今日より前）はグレーアウト
            if (date.getTime() < TODAY.getTime()) {
                dayElement.classList.add('empty-day', 'past-day');
                dayElement.innerHTML += `<span class="status-placeholder">-</span>`;
            } else {
                if (currentStatus) {
                    dayElement.innerHTML += `<span class="status status-${inventoryKey} status-${currentStatus}">${currentStatus}</span>`;
                } else {
                     // 在庫情報がない場合のデバッグ表示
                     dayElement.innerHTML += `<span class="status status-none">?</span>`;
                }
            }
            
            if (currentStatus === '✕') {
                dayElement.classList.add('is-fully-booked');
            }
            
            DAYS_CONTAINER.appendChild(dayElement); 
        }
    }
    
    // ==========================================================
    // 4. イベントリスナーと初期化
    // ==========================================================
    document.getElementById('prev-month').addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    });

    document.getElementById('next-month').addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    });

    renderCalendar();
</script>

<?php get_footer(); ?>