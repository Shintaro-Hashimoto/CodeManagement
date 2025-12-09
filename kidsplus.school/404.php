<?php
/**
 * The template for displaying all pages.
 * @package bau
 */

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;
get_header();
?>
<main class="pages">
  <article>
    <section class="subheader">
      <?php
        $page = get_post( get_the_ID() );
        $page_slug = $page->post_name;
      ?>
      <div class="page-header <?php echo $page_slug ?>-img">
        <div class="container">
          <div class="row">
            <div class="col-md-8">

              <h1 class="page-title">404 Not Found</h1>
            </div>
          </div>
        </div>
      </div>
      <figure class="ill"><img src="<?php echo esc_url( home_url() ); ?>/assets/img/mv_ill.png" alt=""></figure>
    </section>

    <section class="container">
      <div class="row">
        <div class="col-12">
          <div class="page-contents">
            <p class="lead">Webページが見つかりません</p>
            <h2>可能性のある原因</h2>
            <ul class="def">
              <li>アドレスに入力の間違いがある可能性がある。</li>
              <li>リンクをクリックした場合には、リンクが古い場合があります。</li>
            </ul>
            <h2>対処方法</h2>
            <ul class="def">
              <li>アドレスを再入力する。</li>
              <li><a href="javascript:history.back();">前のページに戻る。</a></li>
              <li><a href="<?php echo esc_url(home_url('/') ); ?>">トップページ</a>に移動して必要な情報を探す。</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

  </article>
</main>
<?php get_footer(); ?>