<?php
/*
 * Template Name: 周辺観光ページ (編集可能)
 * Description: 周辺スポットをカード形式で紹介するテンプレート
 */

get_header(); 
?>

<style>
    .sightseeing-wrapper {
        background-color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "Yu Gothic", sans-serif;
        color: #333;
    }

    .sight-section {
        padding: 60px 20px;
        max-width: 1100px;
        margin: 0 auto;
    }
    
    .section-head {
        text-align: center;
        margin-bottom: 50px;
    }
    .section-head h2 {
        font-size: 2rem;
        color: #2C5F2D;
        font-weight: bold;
        display: inline-block;
        border-bottom: 3px solid #E76F51;
        padding-bottom: 5px;
    }

    /* スポットカード */
    .spot-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 30px;
        margin-bottom: 80px;
    }
    .spot-card {
        border: 1px solid #eee;
        border-radius: 8px;
        overflow: hidden;
        transition: transform 0.3s;
    }
    .spot-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 20px rgba(0,0,0,0.05);
    }
    .spot-img-frame {
        height: 200px;
        overflow: hidden;
    }
    .spot-img-frame img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    .spot-body {
        padding: 20px;
    }
    .spot-tag {
        display: inline-block;
        background: #eee;
        font-size: 0.8rem;
        padding: 3px 10px;
        border-radius: 20px;
        margin-bottom: 10px;
        color: #555;
    }
    .spot-tag.winter { background: #E3F2FD; color: #1565C0; }
    .spot-tag.onsen { background: #FBE9E7; color: #D84315; }
    .spot-tag.sport { background: #E8F5E9; color: #2E7D32; }

    .spot-card h3 {
        font-size: 1.2rem;
        margin-bottom: 10px;
        font-weight: bold;
    }
    .spot-card p {
        font-size: 0.95rem;
        color: #666;
        line-height: 1.6;
        margin-bottom: 15px;
    }
    .spot-link {
        display: inline-block;
        color: #2C5F2D;
        text-decoration: none;
        font-weight: bold;
        font-size: 0.9rem;
    }
    .spot-link::after { content: " →"; }
</style>

<div class="sightseeing-wrapper">
    <div class="sight-section">
        <h1 style="text-align:center; font-size:2.2rem; font-weight:bold; margin-bottom:60px;">周辺観光案内</h1>
        <?php
        if ( have_posts() ) :
            while ( have_posts() ) : the_post();
                the_content();
            endwhile;
        endif;
        ?>
    </div>
</div>

<?php get_footer(); ?>