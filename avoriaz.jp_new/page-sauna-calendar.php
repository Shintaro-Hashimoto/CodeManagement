<?php
/**
 * Template Name: サウナカレンダーページ
 * Description: Google Sheetsから取得したサウナ在庫状況を表示するカレンダー
 */

$inventoryKey = 'sauna'; 

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

// 制限日を取得する関数
function get_limit_date($key) {
    $cached_settings = get_option( 'cached_calendar_settings' );
    
    if ( $cached_settings ) {
        $settings = json_decode( $cached_settings, true );
        if (isset($settings[$key])) {
            return date('Y/m/d', strtotime($settings[$key]));
        }
    }

    return date('Y/m/d', strtotime('+6 months'));
}

$inventory = get_cached_inventory();
$js_inventory = !empty($inventory) ? json_encode($inventory) : '{}'; 
$limitEndDate = get_limit_date($inventoryKey);
?>

<style>
    /* 前月・翌月の日付 */
    .other-month {
        background-color: #fcfcfc; /* かなり薄いグレー */
        color: #ccc;
    }
    .other-month .calendar-price {
        color: #ddd;
    }
</style>

<div class="order-form-wrapper">
    <div class="order-form-container">
        <h1 class="form-page-title">サウナ 空き状況 & ご予約</h1>
        
        <div class="inventory-calendar-container">
            <div id="calendar-header">
                <button id="prev-month">◀ 前月</button>
                <h2 id="current-month-year" style="font-size:1.2rem; font-weight:bold;"></h2>
                <button id="next-month">翌月 ▶</button>
            </div>
            <div id="calendar-grid">
                <div class="day-header">日</div><div class="day-header">月</div><div class="day-header">火</div><div class="day-header">水</div><div class="day-header">木</div><div class="day-header">金</div><div class="day-header">土</div>
            </div>
        </div>

        <div style="margin-top: 50px;">
            <h2 style="font-size:1.4rem; border-left:5px solid #2C5F2D; padding-left:15px; margin-bottom:20px;">予約申込みフォーム</h2>
            <p style="margin-bottom:20px; font-size:0.9rem; color:#666;">
                カレンダーの日付をクリックすると、自動で日付が入力されます。
            </p>
            <?php echo do_shortcode('[contact-form-7 id="e894042" title="サウナ予約"]'); ?>
        </div>
    </div>
</div>

<script>
    const inventoryKey = '<?php echo $inventoryKey; ?>'; 
    const INVENTORY_STATUS = <?php echo $js_inventory; ?>;
    const VIEW_LIMIT_END_DATE_STRING = '<?php echo $limitEndDate; ?>';

    const TODAY = new Date();
    TODAY.setHours(0, 0, 0, 0); 
    
    let currentMonth = TODAY.getMonth();
    let currentYear = TODAY.getFullYear();
    
    const DAYS_CONTAINER = document.getElementById('calendar-grid'); 
    const MONTH_YEAR_HEADER = document.getElementById('current-month-year');
    const PREV_BUTTON = document.getElementById('prev-month');
    const NEXT_BUTTON = document.getElementById('next-month');

    const bookingDateInput = document.querySelector('input[name="booking-date"]');
    
    let selectedSaunaDate = null;

    // 日付フォーマットヘルパー (yyyy/mm/dd)
    function formatDateStr(dateObj) {
        return `${dateObj.getFullYear()}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}`;
    }

    function renderCalendar() {
        // 既存の日付セルをクリア（ヘッダー以外）
        let dayHeaders = DAYS_CONTAINER.querySelectorAll('.day-header');
        while (DAYS_CONTAINER.children.length > dayHeaders.length) {
            DAYS_CONTAINER.removeChild(DAYS_CONTAINER.lastChild);
        }
        
        MONTH_YEAR_HEADER.textContent = `${currentYear}年 ${currentMonth + 1}月`;
        
        // 前月ボタン制御
        const firstDayOfCurrentMonth = new Date(currentYear, currentMonth, 1);
        PREV_BUTTON.disabled = firstDayOfCurrentMonth.getTime() <= TODAY.getTime();
        
        // 翌月ボタン制御
        const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
        const nextMonth = currentMonth === 11 ? 1 : currentMonth + 2;
        const nextMonthString = `${nextMonthYear}/${String(nextMonth).padStart(2, '0')}/01`;
        NEXT_BUTTON.disabled = nextMonthString > VIEW_LIMIT_END_DATE_STRING;

        // --- 日付セルの生成ヘルパー ---
        const createDayCell = (dateObj, isCurrentMonth) => {
            dateObj.setHours(0,0,0,0);
            const dateString = formatDateStr(dateObj);
            const time = dateObj.getTime();

            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.setAttribute('data-date', dateString);

            if (!isCurrentMonth) {
                dayElement.classList.add('other-month');
            }

            if (dateString > VIEW_LIMIT_END_DATE_STRING) {
                dayElement.classList.add('empty-day');
                return dayElement;
            }

            const statusData = INVENTORY_STATUS[dateString];
            const currentStatus = statusData ? statusData[inventoryKey] : ''; 

            let cellContent = `<span class="day-number">${dateObj.getDate()}</span>`;
            
            // 選択状態の表示
            if (selectedSaunaDate && dateString === selectedSaunaDate) {
                dayElement.classList.add('selected-from'); 
            }

            if (time < TODAY.getTime()) {
                dayElement.classList.add('empty-day', 'past-day');
                cellContent += `<span class="status-placeholder">-</span>`;
            } else if (time > TODAY.getTime()) {
                if (currentStatus) {
                    cellContent += `<span class="status status-${inventoryKey} status-${currentStatus}">${currentStatus}</span>`;
                } else {
                    cellContent += `<span class="status status-none">?</span>`;
                }
            } else {
                // 当日
                if (currentStatus === '✕' || currentStatus === 'ー') {
                    cellContent += `<span class="status status-${inventoryKey} status-${currentStatus}">${currentStatus}</span>`;
                } else {
                    cellContent += `<span class="status status-tel">Tel </span>`; 
                }
            }
            
            if (currentStatus === '✕') {
                dayElement.classList.add('is-fully-booked');
            }
            
            dayElement.innerHTML = cellContent;
            return dayElement;
        };

        // 1. 前月分の日付を描画
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const startDayOfWeek = firstDayOfMonth.getDay(); // 0(Sun) - 6(Sat)
        
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            const d = new Date(currentYear, currentMonth, 0 - i);
            DAYS_CONTAINER.appendChild(createDayCell(d, false));
        }

        // 2. 当月分の日付を描画
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const d = new Date(currentYear, currentMonth, day);
            DAYS_CONTAINER.appendChild(createDayCell(d, true));
        }

        // 3. 翌月分の日付を描画（週の残りを埋める）
        const endDayOfWeek = lastDayOfMonth.getDay(); // 0(Sun) - 6(Sat)
        if (endDayOfWeek < 6) {
            for (let j = 1; j <= (6 - endDayOfWeek); j++) {
                const d = new Date(currentYear, currentMonth + 1, j);
                DAYS_CONTAINER.appendChild(createDayCell(d, false));
            }
        }
    }
    
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

    DAYS_CONTAINER.addEventListener('click', function(event) {
        const targetDay = event.target.closest('.calendar-day');

        if (!targetDay || 
            targetDay.classList.contains('empty-day') || 
            targetDay.classList.contains('past-day') ||
            targetDay.querySelector('.status-✕') || 
            targetDay.querySelector('.status-ー') || 
            targetDay.querySelector('.status-tel') ) { 
            return; 
        }
        
        const dateSlash = targetDay.getAttribute('data-date'); 
        const dateHyphen = dateSlash.replace(/\//g, '-');

        selectedSaunaDate = dateSlash;

        if (bookingDateInput) {
            bookingDateInput.value = dateHyphen;
            bookingDateInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        renderCalendar();
    });
</script>

<?php get_footer(); ?>