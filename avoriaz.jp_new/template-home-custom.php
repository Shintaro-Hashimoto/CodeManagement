<?php
/**
 * Template Name: カスタムホーム (Code Editor)
 * Description: コードエディタで構築した軽量トップページ
 */

get_header(); // 共通ヘッダーを読み込み
?>

<style>
    /* 共通設定 */
    .custom-home-wrapper {
        font-family: "Helvetica Neue", Arial, sans-serif;
        color: #333;
    }
    
    /* ヒーローセクション */
    .hero-section {
        position: relative;
        height: 80vh;
        min-height: 500px;
        /* 画像パス */
        background-image: url('/wp-content/uploads/2025/11/hero.jpg');
        background-size: cover;
        background-position: center;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        color: #fff;
    }
    .hero-overlay {
        background: rgba(0, 0, 0, 0.3);
        position: absolute;
        top: 0; left: 0; width: 100%; height: 100%;
    }
    .hero-content {
        position: relative;
        z-index: 2;
        padding: 20px;
    }
    .hero-title {
        font-size: 3rem;
        margin-bottom: 20px;
        font-weight: bold;
        text-shadow: 0 2px 10px rgba(0,0,0,0.5);
    }
    .hero-subtitle {
        font-size: 1.2rem;
        margin-bottom: 40px;
        line-height: 1.6;
    }

    /* --- シュトーレン特設バナー (新規追加) --- */
    .promo-section {
        max-width: 1000px;
        margin: -50px auto 50px; /* ヒーロー画像に少し重ねる */
        position: relative;
        z-index: 5;
        padding: 0 20px;
    }
    .promo-box {
        background-color: #fff;
        border: 2px solid #8D6E63; /* パン工房のブラウン */
        border-radius: 8px;
        padding: 40px 20px;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        /* 背景に薄いグラデーション */
        background-image: linear-gradient(to bottom right, #fff, #fffbf5);
    }
    .promo-badge {
        display: inline-block;
        background-color: #c62828; /* クリスマスレッド */
        color: #fff;
        font-size: 0.85rem;
        font-weight: bold;
        padding: 4px 15px;
        border-radius: 20px;
        margin-bottom: 15px;
        letter-spacing: 0.05em;
    }
    .promo-title {
        font-size: 1.6rem;
        color: #333;
        margin-bottom: 10px;
        font-weight: bold;
    }
    .promo-text {
        font-size: 0.95rem;
        color: #666;
        margin-bottom: 25px;
        line-height: 1.8;
    }
    .btn-promo {
        display: inline-block;
        background-color: #8D6E63;
        color: #fff;
        padding: 12px 40px;
        border-radius: 50px;
        font-weight: bold;
        text-decoration: none;
        transition: transform 0.3s, background 0.3s;
        box-shadow: 0 4px 10px rgba(141, 110, 99, 0.4);
    }
    .btn-promo:hover {
        background-color: #6d4c41;
        transform: translateY(-2px);
    }

    /* 3つの入り口 */
    .service-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
        max-width: 1200px;
        /* バナーがあるため、マイナスマージンを解除して通常の間隔にする */
        margin: 0 auto 60px; 
        padding: 0 20px;
        position: relative;
        z-index: 3;
    }
    
    .service-card {
        background: #fff;
        padding: 40px 20px;
        text-align: center;
        border-radius: 8px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        transition: transform 0.3s ease;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        height: 100%;
    }
    .service-card:hover { transform: translateY(-5px); }
    
    .service-title {
        font-size: 1.4rem;
        margin-bottom: 15px;
        color: #2C5F2D;
        font-weight: bold;
        border-bottom: 2px solid #f0f0f0;
        padding-bottom: 10px;
    }
    
    .service-desc {
        font-size: 0.95rem;
        margin-bottom: 25px;
        line-height: 1.8;
        color: #666;
        flex-grow: 1;
    }
    
    /* ボタン */
    .btn-custom {
        display: inline-block;
        padding: 10px 25px;
        background-color: #E76F51;
        color: #fff;
        text-decoration: none;
        border-radius: 50px;
        font-weight: bold;
        transition: background 0.3s;
        align-self: center;
    }
    .btn-custom:hover { background-color: #d65a3b; }
    .btn-custom.green { background-color: #2C5F2D; }
    .btn-custom.brown { background-color: #8D6E63; }

    /* お知らせリストのスタイル */
    .news-list {
        list-style: none;
        padding: 0;
        margin: 0 0 30px;
        text-align: left;
    }
    .news-list li {
        border-bottom: 1px solid #eee;
        padding: 15px 0;
    }
    .news-list li:last-child {
        border-bottom: none;
    }
    .news-date {
        font-size: 0.9rem;
        color: #888;
        margin-right: 15px;
        display: inline-block;
        min-width: 80px;
    }
    .news-list a {
        color: #333;
        text-decoration: none;
        font-weight: 500;
        transition: color 0.2s;
    }
    .news-list a:hover {
        color: #E76F51;
        text-decoration: underline;
    }

    /* スマホ対応 */
    @media (max-width: 768px) {
        .hero-title { font-size: 2rem; }
        
        /* シュトーレンバナー調整 */
        .promo-section { 
            margin-top: -30px; 
            margin-bottom: 40px; 
        }
        .promo-title { font-size: 1.3rem; }
        
        .service-grid { 
            grid-template-columns: 1fr;
            margin-top: 0; /* バナー下のマージン調整 */
            gap: 40px;
        }
        .news-date {
            display: block; /* スマホでは日付を改行 */
            margin-bottom: 5px;
        }
    }
</style>

<div class="custom-home-wrapper">

    <section class="hero-section">
        <div class="hero-overlay"></div>
        <div class="hero-content">
            <h1 class="hero-title">四季を感じる、天空の隠れ家</h1>
            <p class="hero-subtitle">
                創業45年。菅平・峰の原高原 ロッジ アボリア<br>
                心温まるおもてなしと、ここでしか味わえない体験を。
            </p>
        </div>
    </section>

    <section class="promo-section">
        <div class="promo-box">
            <span class="promo-badge">Seasonal Special</span>
            <h2 class="promo-title">自家製シュトーレン 予約受付中</h2>
            <p class="promo-text">
                毎年ご好評いただいているパン工房MARIKOの特製シュトーレン。<br class="pc-only">
                クリスマスを待つ幸せな時間を、こだわりの味わいと共に。
            </p>
            <a href="/stollen-order/" class="btn-promo">ご注文はこちら &rarr;</a>
        </div>
    </section>

    <section class="service-grid">
        <div class="service-card">
            <h2 class="service-title">宿泊</h2>
            <p class="service-desc">
                標高1,400mの静寂。<br>
                <strong style="color: #2C5F2D;">評判の創作料理</strong>と温かいおもてなし。<br>
                ゆったりとした時間をお過ごしください。
            </p>
            <a href="<?php echo home_url('/stay'); ?>" class="btn-custom green">プランを見る</a>
        </div>

        <div class="service-card">
            <h2 class="service-title">CAMP 空庭</h2>
            <p class="service-desc">1日1組限定、満天の星空。<br>プライベートキャンプ場「空庭」。</p>
            <a href="<?php echo home_url('/camp'); ?>" class="btn-custom green">キャンプ場へ</a>
        </div>

        <div class="service-card">
            <h2 class="service-title">パン工房 MARIKO</h2>
            <p class="service-desc">35年焼き続ける自慢の味。<br>シュトーレンのご注文はこちら。</p>
            <a href="<?php echo home_url('/bakery'); ?>" class="btn-custom brown">パン工房へ</a>
        </div>
    </section>

    <section style="max-width: 800px; margin: 0 auto 80px; padding: 20px;">
        <h3 style="font-size: 1.8rem; margin-bottom: 30px; color:#333; text-align: center;">NEWS & EVENT</h3>
        
        <ul class="news-list">
            <?php
            // 最新記事を2件取得するクエリ
            $news_query = new WP_Query( array(
                'post_type'      => 'post',
                'posts_per_page' => 2,
                'ignore_sticky_posts' => 1
            ) );

            if ( $news_query->have_posts() ) :
                while ( $news_query->have_posts() ) : $news_query->the_post();
            ?>
                <li>
                    <span class="news-date"><?php echo get_the_date('Y.m.d'); ?></span>
                    <a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
                </li>
            <?php
                endwhile;
                wp_reset_postdata();
            else :
            ?>
                <li style="text-align: center; border:none;">現在、お知らせはありません。</li>
            <?php endif; ?>
        </ul>

        <div style="text-align: center;">
            <a href="<?php echo home_url('/news'); ?>" style="color: #2C5F2D; text-decoration: underline; font-weight: bold;">お知らせ一覧へ &rarr;</a>
        </div>
    </section>

</div>

<?php get_footer(); ?>