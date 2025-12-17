<?php
/**
 * Template Name: 宿泊カレンダーページ
 * Description: Google Sheetsから取得した宿泊在庫状況を表示するカレンダー
 */

$inventoryKey = 'stay'; 

get_header(); 

function get_cached_inventory() {
    $cached_data = get_option( 'cached_inventory_status' );
    if ( $cached_data ) {
        return json_decode( $cached_data, true ); 
    }
    return [];
}

function get_limit_date($key) {
    $cached_settings = get_option( 'cached_calendar_settings' );
    
    if ( $cached_settings ) {
        $settings = json_decode( $cached_settings, true );
        if (isset($settings[$key])) {
            // 日付フォーマットを統一
            return date('Y/m/d', strtotime($settings[$key]));
        }
    }
    // 設定がない場合の保険（今日から6ヶ月後）
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
    
    /* ★修正: 選択不可（バリア以降の日付）のスタイルを変更 */
    .disabled-date {
        background-color: #f7f7f7 !important; /* 背景を非常に薄いグレーに固定 */
        cursor: pointer; 
        color: #999; /* 文字色も少し薄く */
    }
    
    /* ★修正: 選択不可エリア内の要素を全体的に薄くする */
    .disabled-date .day-number,
    .disabled-date .status,
    .disabled-date .calendar-price {
        opacity: 0.4; /* 全体の透明度を下げて存在感を薄くする */
    }

    /* 料金表示の調整 */
    .calendar-price {
        display: block; 
        font-size: 0.8rem; 
        color: #555;
    }
    .other-month .calendar-price {
        color: #ddd;
    }
</style>

<div class="order-form-wrapper">
    <div class="order-form-container">
        <h1 class="form-page-title">宿泊 空室状況 & ご予約</h1>
        
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

        <p class="calendar-note">
            ※表示金額は、大人1室2名以上ご利用の場合の1名様あたりの料金（税込）です。<br>
            ※シングルユースの場合は、料金表をご確認ください。
        </p>

        <div style="margin-top: 50px;">
            <h2 style="font-size:1.4rem; border-left:5px solid #2C5F2D; padding-left:15px; margin-bottom:20px;">予約申込みフォーム</h2>
            <p style="margin-bottom:20px; font-size:0.9rem; color:#666;">
                カレンダーの日付をクリックすると、自動で日付が入力されます。
            </p>
            <?php echo do_shortcode('[contact-form-7 id="23db074" title="宿泊予約"]'); ?>
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

    let selectedCheckIn = null;
    let selectedCheckOut = null;
    const checkInInput = document.querySelector('input[name="checkin-date"]');
    const checkOutInput = document.querySelector('input[name="checkout-date"]');

    // 日付フォーマットヘルパー (yyyy/mm/dd)
    function formatDateStr(dateObj) {
        return `${dateObj.getFullYear()}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}`;
    }

    // カレンダー描画関数
    function renderCalendar() {
        let dayHeaders = DAYS_CONTAINER.querySelectorAll('.day-header');
        while (DAYS_CONTAINER.children.length > dayHeaders.length) {
            DAYS_CONTAINER.removeChild(DAYS_CONTAINER.lastChild);
        }
        
        MONTH_YEAR_HEADER.textContent = `${currentYear}年 ${currentMonth + 1}月`;
        
        const firstDayOfCurrentMonth = new Date(currentYear, currentMonth, 1);
        PREV_BUTTON.disabled = firstDayOfCurrentMonth.getTime() <= TODAY.getTime();
        
        const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
        const nextMonth = currentMonth === 11 ? 1 : currentMonth + 2;
        const nextMonthString = `${nextMonthYear}/${String(nextMonth).padStart(2, '0')}/01`;
        NEXT_BUTTON.disabled = nextMonthString > VIEW_LIMIT_END_DATE_STRING;

        // --- グレーアウトのバリア（制限日）を計算 ---
        let disableAfterDate = null;
        if (selectedCheckIn) {
            let checkCursor = new Date(selectedCheckIn);
            // 最大60日先までチェック
            for (let k = 0; k < 60; k++) {
                const cStr = formatDateStr(checkCursor);
                const statusInfo = INVENTORY_STATUS[cStr];
                const s = statusInfo ? statusInfo[inventoryKey] : '';
                
                if (s === '✕' || s === 'ー') {
                    disableAfterDate = new Date(checkCursor);
                    break;
                }
                checkCursor.setDate(checkCursor.getDate() + 1);
            }
        }

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

            // グレーアウト判定
            if (disableAfterDate && time > disableAfterDate.getTime()) {
                dayElement.classList.add('disabled-date');
            }

            const statusData = INVENTORY_STATUS[dateString];
            const currentStatus = statusData ? statusData[inventoryKey] : ''; 
            const price = statusData ? statusData['price'] : '';

            let cellContent = `<span class="day-number">${dateObj.getDate()}</span>`;

            if (selectedCheckIn) {
                const checkInTime = new Date(selectedCheckIn).getTime();
                if (time === checkInTime) dayElement.classList.add('selected-from');
                
                if (selectedCheckOut) {
                    const checkOutTime = new Date(selectedCheckOut).getTime();
                    if (time === checkOutTime) dayElement.classList.add('selected-to');
                    if (time > checkInTime && time < checkOutTime) dayElement.classList.add('selected-range');
                }
            }

            if (time < TODAY.getTime()) {
                dayElement.classList.add('empty-day', 'past-day');
                cellContent += `<span class="status-placeholder">-</span>`;
            } else if (time > TODAY.getTime()) {
                if (currentStatus) {
                    cellContent += `<span class="status status-${inventoryKey} status-${currentStatus}">${currentStatus}</span>`;
                    if (price && price > 0 && currentStatus !== '✕' && currentStatus !== 'ー') {
                        const formattedPrice = Number(price).toLocaleString();
                        cellContent += `<span class="calendar-price">¥${formattedPrice}~</span>`;
                    }
                } else {
                    cellContent += `<span class="status status-none">?</span>`;
                }
            } else {
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

        // 1. 前月分
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const startDayOfWeek = firstDayOfMonth.getDay();
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            const d = new Date(currentYear, currentMonth, 0 - i);
            DAYS_CONTAINER.appendChild(createDayCell(d, false));
        }

        // 2. 当月分
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();
        for (let day = 1; day <= daysInMonth; day++) {
            const d = new Date(currentYear, currentMonth, day);
            DAYS_CONTAINER.appendChild(createDayCell(d, true));
        }

        // 3. 翌月分
        const endDayOfWeek = lastDayOfMonth.getDay();
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
    
    // 期間チェック関数
    function isRangeAvailable(startDateStr, endDateStr) {
        let currentDate = new Date(startDateStr);
        let endDate = new Date(endDateStr);
        
        while (currentDate.getTime() < endDate.getTime()) {
            const dateString = formatDateStr(currentDate);
            const statusData = INVENTORY_STATUS[dateString];
            const currentStatus = statusData ? statusData[inventoryKey] : '';
            
            if (currentStatus === '✕' || currentStatus === 'ー') {
                return false; 
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return true; 
    }

    // クリックイベント
    DAYS_CONTAINER.addEventListener('click', function(event) {
        const targetDay = event.target.closest('.calendar-day');

        // クリック無効条件
        if (!targetDay || 
            targetDay.classList.contains('empty-day') || 
            targetDay.classList.contains('past-day') ||
            targetDay.querySelector('.status-ー') ) { 
            return; 
        }
        
        const dateSlash = targetDay.getAttribute('data-date'); 
        const clickedTime = new Date(dateSlash).getTime(); 
        const isUnavailable = targetDay.querySelector('.status-✕') || targetDay.querySelector('.status-tel');

        if (!selectedCheckIn || selectedCheckOut) {
            if (isUnavailable) {
                return;
            }
            selectedCheckIn = dateSlash; 
            selectedCheckOut = null;

        } else {
            const checkInTime = new Date(selectedCheckIn).getTime(); 

            if (clickedTime < checkInTime) {
                // 新しいチェックイン
                if (isUnavailable) {
                    return;
                }
                selectedCheckIn = dateSlash; 
                selectedCheckOut = null;

            } else if (clickedTime > checkInTime) {
                // チェックアウト
                if (isRangeAvailable(selectedCheckIn, dateSlash)) {
                    selectedCheckOut = dateSlash; 
                } else {
                    // バリア跨ぎならリセットして新チェックイン
                    if (!isUnavailable) {
                        selectedCheckIn = dateSlash; 
                        selectedCheckOut = null;
                    } else {
                        return;
                    }
                }
            } else {
                // 同じ日 -> リセット
                selectedCheckIn = null;
                selectedCheckOut = null;
            }
        }

        if (checkInInput) {
            checkInInput.value = selectedCheckIn ? selectedCheckIn.replace(/\//g, '-') : '';
        }
        if (checkOutInput) {
            checkOutInput.value = selectedCheckOut ? selectedCheckOut.replace(/\//g, '-') : '';
        }

        renderCalendar();

        if (selectedCheckIn && selectedCheckOut && checkOutInput) {
            checkOutInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
</script>

<?php get_footer(); ?>