<?php
/*
 * Template Name: 宿泊ページ (編集可能)
 * Description: CSSはここで管理し、本文は管理画面のエディタで編集するテンプレート
 */

get_header(); 
?>

<style>
    /* --- 宿泊ページ専用スタイル --- */
    .stay-wrapper {
        background-color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "Yu Gothic", sans-serif;
        color: #333;
    }

    /* 共通セクション */
    .stay-section {
        padding: 60px 20px;
        max-width: 1000px;
        margin: 0 auto;
    }
    .stay-section h2 {
        font-size: 2rem;
        text-align: center;
        margin-bottom: 40px;
        color: #2C5F2D;
        position: relative;
        font-weight: bold;
    }
    .stay-section h2::after {
        content: "";
        display: block;
        width: 60px;
        height: 3px;
        background: #E76F51;
        margin: 15px auto 0;
    }

    /* ヒーローエリア */
    .stay-hero {
        height: 60vh;
        min-height: 400px;
        background-size: cover;
        background-position: center;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        text-shadow: 0 2px 10px rgba(0,0,0,0.6);
        background-color: #333;
        position: relative;
    }
    .stay-hero::before {
        content: "";
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,0.2); 
    }
    .stay-hero h1 { 
        font-size: 3rem; 
        font-weight: bold; 
        margin: 0; 
        position: relative; 
        z-index: 2; 
    }

    /* 2カラムレイアウト */
    .two-col {
        display: flex;
        flex-wrap: wrap;
        gap: 40px;
        align-items: center;
        margin-bottom: 60px;
    }
    .two-col.reverse { flex-direction: row-reverse; }
    .two-col img {
        flex: 1;
        min-width: 300px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        height: 300px;
        object-fit: cover;
    }
    .two-col-text {
        flex: 1;
        min-width: 300px;
    }
    .two-col-text h3 {
        font-size: 1.5rem;
        color: #2C5F2D;
        margin-bottom: 15px;
        border-left: 4px solid #E76F51;
        padding-left: 15px;
    }
    .two-col-text p {
        line-height: 1.8;
        margin-bottom: 15px;
    }

    /* 料理セクション */
    .food-highlight {
        background-color: #f9fcf9;
    }
    .food-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin-top: 40px;
    }
    .food-item img {
        width: 100%;
        height: 200px;
        object-fit: cover;
        border-radius: 8px;
        margin-bottom: 10px;
    }
    .food-item p { font-size: 0.9rem; font-weight: bold; color: #555; }

    /* 料金表エリア */
    .price-block {
        margin-bottom: 50px;
    }
    .price-title {
        font-size: 1.2rem;
        font-weight: bold;
        color: #2C5F2D;
        margin-bottom: 10px;
        border-left: 5px solid #E76F51;
        padding-left: 10px;
        background: #f9f9f9;
        padding: 10px;
    }
    
    .price-table {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #ddd;
        background-color: #fff;
        font-size: 0.95rem;
        min-width: 600px; /* 横スクロール用に少し幅を確保 */
    }
    .table-scroll {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        margin-bottom: 20px;
    }
    
    .price-table th, .price-table td {
        padding: 12px;
        border: 1px solid #eee;
        text-align: center;
        vertical-align: middle;
    }
    /* ヘッダー行 (緑背景・白文字) */
    .price-table thead th {
        background-color: #2C5F2D !important;
        color: #fff !important;
        font-weight: bold;
        white-space: nowrap;
        line-height: 1.4;
    }
    .price-table thead th small {
        font-size: 0.8rem;
        font-weight: normal;
        display: block;
        opacity: 0.9;
    }
    /* 左列 (プラン名) */
    .price-table tbody th {
        background-color: #f4f4f4;
        text-align: left;
        font-weight: bold;
        color: #333;
        width: 25%;
        min-width: 150px;
    }
    .price-table td {
        color: #333;
    }

    /* 予約CTA */
    .reserve-cta {
        text-align: center;
        padding: 60px 20px;
        background-color: #f4f4f4;
    }
    .btn-big {
        display: inline-block;
        background-color: #E76F51;
        color: #fff;
        padding: 15px 50px;
        font-size: 1.2rem;
        font-weight: bold;
        border-radius: 4px;
        text-decoration: none;
        transition: transform 0.3s, background 0.3s;
        box-shadow: 0 5px 15px rgba(231, 111, 81, 0.4);
    }
    .btn-big:hover {
        background-color: #d65a3b;
        transform: translateY(-3px);
        color: #fff;
    }

    @media (max-width: 768px) {
        .stay-hero h1 { font-size: 2rem; }
        .stay-section h2 { font-size: 1.5rem; }
        .two-col { flex-direction: column; }
        .two-col.reverse { flex-direction: column; }
    }
</style>

<div class="stay-wrapper">
    <?php
    // 管理画面の本文表示 (ヒーローやコンセプト、料理、客室のHTML)
    if ( have_posts() ) :
        while ( have_posts() ) : the_post();
            the_content();
        endwhile;
    endif;
    ?>

    <section class="stay-section" style="padding-top: 0;">
        <h2>ご利用料金</h2>
        <p style="text-align:center; margin-bottom:40px;">
            ※表示価格はすべて税込・1名様あたりの料金です。<br>
            ※該当期間は予約カレンダーにてご確認ください。
        </p>

        <div class="price-block">
            <div class="price-title">大人 (1室2名様以上利用)</div>
            <div class="table-scroll">
                <table class="price-table">
                    <thead>
                        <tr>
                            <th>プラン</th>
                            <th>通常</th>
                            <th>季節料金<br><small>(7月海の日～8月31日)</small></th>
                            <th>季節料金<br><small>(お盆・お正月)</small></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <th>1泊2食付き</th>
                            <td>¥15,800</td>
                            <td>¥16,800</td>
                            <td>¥17,800</td>
                        </tr>
                        <tr>
                            <th>1泊朝食 (B&B)</th>
                            <td>¥12,500</td>
                            <td>¥13,500</td>
                            <td>¥14,500</td>
                        </tr>
                        <tr>
                            <th>素泊まり</th>
                            <td>¥11,000</td>
                            <td>¥12,100</td>
                            <td>¥13,200</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div class="price-block">
            <div class="price-title">大人 (シングル利用)</div>
            <div class="table-scroll">
                <table class="price-table">
                    <thead>
                        <tr>
                            <th>プラン</th>
                            <th>通常</th>
                            <th>季節料金<br><small>(7月海の日～8月31日)</small></th>
                            <th>季節料金<br><small>(お盆・お正月)</small></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <th>1泊2食付き</th>
                            <td>¥18,800</td>
                            <td>¥22,800</td>
                            <td>¥25,800</td>
                        </tr>
                        <tr>
                            <th>1泊朝食 (B&B)</th>
                            <td>¥13,500</td>
                            <td>¥14,500</td>
                            <td>¥15,600</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div class="price-block">
            <div class="price-title">お子様料金</div>
            <div class="table-scroll">
                <table class="price-table">
                    <thead>
                        <tr>
                            <th>区分 / プラン</th>
                            <th>通常</th>
                            <th>季節料金<br><small>(7月海の日～8月31日)</small></th>
                            <th>季節料金<br><small>(お盆・お正月)</small></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <th>小学生 (1泊2食)</th>
                            <td>¥11,000</td>
                            <td>¥12,100</td>
                            <td>¥13,200</td>
                        </tr>
                        <tr>
                            <th>小学生 (1泊朝食)</th>
                            <td>¥8,800</td>
                            <td>¥9,900</td>
                            <td>¥11,000</td>
                        </tr>
                        <tr>
                            <th>小学生 (素泊まり)</th>
                            <td>¥7,700</td>
                            <td>¥8,800</td>
                            <td>¥9,900</td>
                        </tr>
                        <tr>
                            <th>幼児 (1泊2食)</th>
                            <td>¥8,800</td>
                            <td>¥9,900</td>
                            <td>¥9,900</td>
                        </tr>
                        <tr>
                            <th>幼児 (1泊朝食)</th>
                            <td>¥6,600</td>
                            <td>¥7,700</td>
                            <td>¥7,700</td>
                        </tr>
                        <tr>
                            <th>幼児 (食事のみ)</th>
                            <td>¥4,400</td>
                            <td>¥5,500</td>
                            <td>¥5,500</td>
                        </tr>
                        <tr>
                            <th>幼児 (ベッドのみ)</th>
                            <td>¥4,400</td>
                            <td>¥5,500</td>
                            <td>¥5,500</td>
                        </tr>
                        <tr>
                            <th>幼児 (食事寝具なし)</th>
                            <td>¥1,100</td>
                            <td>¥2,200</td>
                            <td>¥2,200</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <p style="font-size: 0.8rem; margin-top: 20px; color: #666;">
            ※別途、冬期は暖房費を頂戴する場合がございます。
        </p>
    </section>

    <div class="reserve-cta">
        <h2 style="font-size: 1.8rem; margin-bottom: 20px;">空室状況・ご予約</h2>
        <p style="margin-bottom: 30px;">
            空室状況をご確認の上、フォームよりご予約ください。<br>
            皆様のお越しを心よりお待ちしております。
        </p>
        <a href="/reservation-stay/" class="btn-big">宿泊予約カレンダーへ</a>
    </div>

</div>

<?php get_footer(); ?>