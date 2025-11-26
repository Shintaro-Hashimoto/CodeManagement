<?php
/**
 * The template for displaying 404 pages (not found)
 */

get_header(); 
?>

<style>
    /* --- 404ページ専用スタイル --- */
    .error-404-wrapper {
        background-color: #f6f7fb;
        font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "Yu Gothic", sans-serif;
        color: #333;
        padding: 100px 20px;
        text-align: center;
        min-height: 60vh; /* フッターが上がりすぎないように */
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }

    .error-404-content {
        background: #fff;
        padding: 60px 40px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.05);
        max-width: 600px;
        width: 100%;
    }

    .error-code {
        font-size: 6rem;
        font-weight: bold;
        color: #E76F51; /* アクセントカラー(オレンジ) */
        line-height: 1;
        margin-bottom: 20px;
        font-family: "Helvetica Neue", Arial, sans-serif;
    }

    .error-title {
        font-size: 1.5rem;
        font-weight: bold;
        margin-bottom: 20px;
        color: #2C5F2D; /* メインカラー(緑) */
    }

    .error-text {
        font-size: 1rem;
        line-height: 1.8;
        color: #666;
        margin-bottom: 40px;
    }

    .btn-home {
        display: inline-block;
        background-color: #2C5F2D;
        color: #fff;
        padding: 12px 40px;
        border-radius: 50px;
        text-decoration: none;
        font-weight: bold;
        transition: background 0.3s, transform 0.3s;
        box-shadow: 0 4px 10px rgba(44, 95, 45, 0.3);
    }
    .btn-home:hover {
        background-color: #1e421f;
        transform: translateY(-2px);
        color: #fff;
    }

    @media (max-width: 768px) {
        .error-code { font-size: 4rem; }
        .error-title { font-size: 1.2rem; }
    }
</style>

<div class="error-404-wrapper">
    <div class="error-404-content">
        <div class="error-code">404</div>
        <h1 class="error-title">お探しのページは見つかりませんでした</h1>
        
        <p class="error-text">
            アクセスしようとしたページは、削除されたかURLが変更された可能性があります。<br>
            お手数ですが、トップページより再度お探しください。
        </p>

        <a href="<?php echo home_url(); ?>" class="btn-home">トップページへ戻る</a>
    </div>
</div>

<?php get_footer(); ?>