<?php
/**
 * The main template file.
 * @package bau
 */

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;
get_header();
?>

<div class="mv">
  <div class="hero">
    <div class="text anime anime--lr">
      <p class="mds">月6,600円～はじめられる</p><br>
      <h2>楽しく学ぶ。<br class="d-inline d-lg-none">未来を創る。<br>オンライン英会話</h2>
      <p>他園との差別化を図る、リーズナブルなオンライン英会話の導入なら<br>KIDS PLUS englishにお任せください。</p>
    </div>
    <figure class="ill"><img src="<?php echo esc_url( home_url() ); ?>/assets/img/mv_ill.png" alt="KIDS PLUS english 楽しく学ぶ。未来を創る。オンライン英会話"></figure>
    <div class="age">対象年齢<br>0歳～5歳</div>
  </div>
</div>

<main>
  <section class="top-intro">
    <div class="container">
      <div class="row justify-content-between align-items-center">
        <div class="col-md-12 text-center">
          <h2>保育園・幼稚園向け<br>担任制のオンライン英会話の導入は<br>KIDS PLUS englishへ</h2>
        </div>
      </div>

      <div class="row justify-content-between">
        <div class="col-lg-6">
          <div class="text message">
            <p>幼稚園や保育園に英会話プログラムを導入することは、子どもにとって「言語能力の早期獲得」「英語コミュニケーション能力向上」「学習意欲の向上」などのメリットがあります。他の園との差別化を図るためにも有効ですが、導入にはコスト面や専門人材の確保、カリキュラムへの適応が求められるなどの課題があります。</p>
            <p>KIDS PLUS englishのオンライン英会話プログラムは、ネイティブ講師の担任制とすることでコストを抑えながらも楽しく学べる英会話を提供しています。</p>
          </div>
        </div>
        <div class="col-lg-6 text-center">
          <ul class="row justify-content-between list-unstyled">
            <li class="col-4"><figure><img src="<?php echo esc_url( home_url() ); ?>/assets/img/intro_img01.jpg" alt="こどもオンライン英会話" class="rounded-4"></figure></li>
            <li class="col-4"><figure><img src="<?php echo esc_url( home_url() ); ?>/assets/img/intro_img02.jpg" alt="こどもオンライン英会話" class="rounded-4"></figure></li>
            <li class="col-4"><figure><img src="<?php echo esc_url( home_url() ); ?>/assets/img/intro_img03.jpg" alt="こどもオンライン英会話" class="rounded-4"></figure></li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <section class="top-movie anime anime--up">
    <div class="container">
      <div class="row justify-content-center align-items-center">
        <div class="col-md-8 text-center">
          <div class="btn-block"><a href="<?php echo esc_url( home_url( '/contact/' ) ); ?>" class="btn-conv">今すぐ無料体験を申し込む</a></div>
        </div>
      </div>
    </div>
  </section>


  <section class="top-about anime anime--up">
    <div class="container">
      <div class="row justify-content-center align-items-center">
        <div class="col-md-12 text-center">
          <h2>KIDS PLUS englishとは</h2>
          <p class="f-lg col-md-8 mx-auto text-start">子どもへの英会話力は早いうちからのトレーニングで英語を英語で考える習慣が身に付き、思考力・表現力・異文化理解が深まります。KIDS PLUS englishは、遊びながら学ぶことで好奇心や積極性が引き出されるプログラムを提供しています。</p>
          <p class="f-lg col-md-8 mx-auto text-start">また、講師の出身地であるフィリピンでは小学校からすべての授業が英語で行われ、日本人同様に英語を学んで身に付けるために英語学習の勘所がネイティブ(イギリス人、アメリカ人など)よりも的確です。</p>
          <div class="col-md-8 mx-auto text-start">
            <div class="btn-link"><a href="<?php echo esc_url( home_url( '/teachers/' ) ); ?>">講師陣はこちら</a></div>
          </div>
        </div>
      </div>
    </div>
  </section>


  <section class="section top-blog anime anime--up">
    <div class="container-fluid">
      <div class="row">
        <div class="col-12 text-center">
          <h2 class="mds">サポートブログ</h2>
          <p>導入の際に役立つサポートブログを更新中。</p>
        </div>
      </div>

      <div class="row ps-5 pb-5">


<!-- swiper -->
<div class="swiper">
<div class="swiper-container blog-swipe">
<div class="swiper-wrapper">

<?php $get_posts_parm = 'numberposts=8'; ?>
<?php $blogposts = get_posts($get_posts_parm); ?>
<?php foreach($blogposts as $post):setup_postdata( $post ); ?>
        <div class="swiper-slide col-md-4">
          <a href="<?php the_permalink(); ?>" class="card h-100">
<?php if ( has_post_thumbnail() ) : ?>
<?php the_post_thumbnail( 'blog-thumb', array( 'class' => 'thumbnailimg' ) ); ?>
<?php else : ?>
            <figure><img src="/assets/img/no_image.png" alt="<?php the_title(); ?>"></figure>
<?php endif; ?>

            <div class="text h-100">
              <div class="d-flex justify-content-between">
                <span class="date"><?php the_time('Y.n.j'); ?></span>
                <span class="cat cat-support"><?php $cat = get_the_category(); $cat = $cat[0]; { echo $cat->cat_name; } ?></span>
              </div>
              <h3><?php the_title(); ?></h3>
            </div>
          </a>
        </div>
<?php endforeach; ?>
<?php wp_reset_postdata(); ?>

</div>
</div>
</div>
<!-- /swiper -->

        <div class="position-relative">
          <div class="swiper-button-prev"><i class="ri-arrow-left-s-line"></i></div>
          <div class="swiper-button-next"><i class="ri-arrow-right-s-line"></i></div>
        </div>

      </div>

      <div class="row">
        <div class="col-12 text-center">
          <div class="btn-block"><a href="<?php echo esc_url( home_url( '/blog/' ) ); ?>" class="btn-primary btn">ブログ一覧へ</a></div>
        </div>
      </div>
    </div>
  </section>



  <section class="section top-feature anime anime--up">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-md-12">
          <div class="box anime anime--up">
            <h2 class="text-center"><span class="en">Feature</span><br>オンライン英会話の特長</h2>

            <div class="row justify-content-end">
              <div class="col-md-5">
                <div class="feature-item">
                  <span class="num">01</span>
                  <h3>他社と比較しても圧倒的にリーズナブルな料金プラン</h3>
                  <p>「同品質の教育を全施設に導入したい」というグループ園経営のニーズに応じて、3施設合同レッスンプランをご用意しました。合同レッスンを通じて、リーズナブルな料金で質の高い教育を提供します。また、「まずは1施設1クラスから始めたい」という施設様には、気軽にスタートできるベーシックプランもご用意。週1〜5回、複数クラスに応じたプランも選べるため、柔軟に対応可能です。</p>
                </div>
              </div>
              <div class="col-md-5">
                <figure class="text-end ms-5"><img src="<?php echo esc_url( home_url() ); ?>/assets/img/top_feature01.jpg" alt="他社と比較しても圧倒的にリーズナブルな料金プラン"></figure>
              </div>
            </div>

            <div class="row justify-content-end flex-row-reverse">
              <div class="col-md-5 ms-md-5">
                <div class="feature-item">
                  <span class="num">02</span>
                  <h3>月齢に合わせた独自のカリキュラム</h3>
                  <p>シニアや親子にも人気の語学留学「Howdy English Academy」と提携し、その豊富なノウハウを活かして独自のカリキュラムを作成しました。ネイティブ講師によるレッスンは、子どもの発達段階に合わせた質の高く楽しい内容です。さらに、全ての講師が出社してオンラインレッスンを行っているため、他社と比較しても通信環境は良好で、講師陣の教育制度も厳格に管理されています。</p>
                </div>
              </div>
              <div class="col-md-5">
                <figure class="me-5"><img src="<?php echo esc_url( home_url() ); ?>/assets/img/top_feature02.png" alt="月齢に合わせた独自のカリキュラム"></figure>
              </div>
            </div>

            <div class="row justify-content-end">
              <div class="col-md-5">
                <div class="feature-item">
                  <span class="num">03</span>
                  <h3>誰でも簡単に導入可能・サポートも充実</h3>
                  <p>現場の負担を軽減するため、機器を接続するだけで簡単にレッスンを始められます。機器がない施設様には、必要な機器をお届けし、接続するだけの「導入パッケージ（機器レンタル）」をご用意しております。また、授業に関するお困りごとは、講師への連絡は不要で、弊社の日本人サポートデスクが迅速に対応いたします。</p>
                </div>
              </div>
              <div class="col-md-5">
                <figure class="text-end ms-5"><img src="<?php echo esc_url( home_url() ); ?>/assets/img/top_feature03.jpg" alt="誰でも簡単に導入可能・サポートも充実"></figure>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="section top-plan anime anime--up">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-md-12">
          <div class="box anime anime--up">
            <h2 class="text-center"><span class="en">Plan & Price</span><br>プラン＆料金</h2>
            <p class="text-center px-3 mb-5">各プラン１コマは25分。週1回から5回まで貴園にあわせて始められます。<br>
            対象年齢は0～5歳、推奨人数は1クラス園児15名です。講師は1名のオンラインプログラムです。</p>
    <div class="container">

              <div class="row justify-content-center gy-6">
                <div class="col-md-4 col-xl-3">
                  <p class="ch f-blue">気軽にはじめたい！</p>
                  <div class="pricing pricing-basic text-center">
                    <h3 class="f-blue">ベーシックプラン</h3>
                    <p class="ex">1日1クラスから</p>
                    <p class="price">12,800<small>円～</small></p>
                    <ul>
                      <li><i class="ri-checkbox-circle-line"></i> 担任制</li>
                      <li><i class="ri-checkbox-circle-line"></i> 週１回から</li>
                      <li><i class="ri-checkbox-circle-line"></i> 1施設</li>
                      <li><i class="ri-checkbox-circle-line"></i> 1～複数クラスOK</li>
                    </ul>
                    <p class="text-start">会話形式で週1回からでも始められます。ミニマムに１クラスから実施可能です。複数クラスの場合はお問い合わせください</p>
                  </div>
                </div>
                <div class="col-md-4 col-xl-3">
                  <p class="ch f-pink">系列施設にも導入したい！</p>
                  <div class="pricing pricing-group text-center">
                    <h3 class="f-pink">グループプラン</h3>
                    <p class="ex">1日3施設合同レッスンから</p>
                    <p class="price">6,600<small>円～</small></p>
                    <ul>
                      <li><i class="ri-checkbox-circle-line"></i> 担任制</li>
                      <li><i class="ri-checkbox-circle-line"></i> 週１回から</li>
                      <li><i class="ri-checkbox-circle-line"></i> 複数施設OK</li>
                      <li><i class="ri-checkbox-circle-line"></i> 3施設合同レッスンOK</li>
                    </ul>

                    <p class="text-start">会話形式で週1回からでも始められます。３施設に合同レッスンするプラン。３施設以上の場合もご相談いただけます。</p>
                  </div>
                </div>
              </div>
    </div>

            <div class="btn-block"><a href="<?php echo esc_url( home_url( '/contact/' ) ); ?>" class="btn-conv">お申込はこちら</a></div>

          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="section top-flow anime anime--up">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-md-12 text-center">
          <h2 class="mds">プログラム導入の流れ</h2>
          <p>パソコンが苦手、英語が苦手な保育園・幼稚園さまでも大丈夫。<br>かんたんな設定と丁寧なサポートで導入をサポート</p>
        </div>
      </div>

      <div class="row gy-4 justify-content-center">
        <div class="col-6 col-lg-3 text-center">
          <div class="flow-item h-100">
            <figure class="border rounded-circle d-inline-block"><img src="<?php echo esc_url( home_url() ); ?>/assets/img/flow_ill01.png" alt="無料体験お申し込み"></figure>
            <h3>無料体験<br>お申し込み</h3>
          </div>
        </div>
        <div class="col-6 col-lg-3 text-center">
          <div class="flow-item h-100">
            <figure class="border rounded-circle d-inline-block"><img src="<?php echo esc_url( home_url() ); ?>/assets/img/flow_ill02.png" alt="ヒアリング導入サポート"></figure>
            <h3>ヒアリング<br>導入サポート</h3>
          </div>
        </div>
        <div class="col-6 col-lg-3 text-center">
          <div class="flow-item h-100">
            <figure class="border rounded-circle d-inline-block"><img src="<?php echo esc_url( home_url() ); ?>/assets/img/flow_ill03.png" alt="テスト配信事前打ち合わせ"></figure>
            <h3>テスト配信<br>事前打ち合わせ</h3>
          </div>
        </div>
        <div class="col-6 col-lg-3 text-center">
          <div class="flow-item h-100">
            <figure class="border rounded-circle d-inline-block"><img src="<?php echo esc_url( home_url() ); ?>/assets/img/flow_ill04.png" alt="英会話プログラム開始"></figure>
            <h3>英会話<br>プログラム開始</h3>
          </div>
        </div>
      </div>

      <div class="row">
        <div class="col-12 text-center">
          <div class="btn-block"><a href="<?php echo esc_url( home_url( '/guide/' ) ); ?>" class="btn-primary btn">導入ガイドへ</a></div>
        </div>
      </div>

    </div>
  </section>

  <section class="section top-faq anime anime--up">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-md-12 text-center">
<h2 class="mds">よくあるご質問</h2>
<p>よくあるご質問をまとめました。</p>
        </div>
      </div>

      <div class="row justify-content-center">
        <div class="col-md-12">
          <div class="accordion accordion-flush" id="accordionFlush">

            <div class="accordion-item">
              <h2 class="accordion-header">
                <div class="accordion-button collapsed" data-bs-toggle="collapse" data-bs-target="#flush-collapseOne" aria-expanded="false" aria-controls="flush-collapseOne">
                  Q. 保育士も英語を話せないといけないですか？
                </div>
              </h2>
              <div id="flush-collapseOne" class="accordion-collapse collapse" data-bs-parent="#accordionFlush">
                <div class="accordion-body">そんなことはございません。お時間がある場合は、ぜひ子どもたちと一緒に気軽に英語レッスンをお楽しみいただければと思います。</div>
              </div>
            </div>
            <div class="accordion-item">
              <h2 class="accordion-header">
                <div class="accordion-button collapsed" data-bs-toggle="collapse" data-bs-target="#flush-collapseTwo" aria-expanded="false" aria-controls="flush-collapseTwo">
                  Q. 料金の支払い方法について教えてください。
                </div>
              </h2>
              <div id="flush-collapseTwo" class="accordion-collapse collapse" data-bs-parent="#accordionFlush">
                <div class="accordion-body">お支払い方法は、銀行振込、クレジットカードをご利用いただけます。</div>
              </div>
            </div>
            <div class="accordion-item">
              <h2 class="accordion-header">
                <div class="accordion-button collapsed" data-bs-toggle="collapse" data-bs-target="#flush-collapseThree" aria-expanded="false" aria-controls="flush-collapseThree">
                  Q. 感染症などの突然の閉園に伴いレッスンをキャンセルしたい場合はどうすればいいですか？
                </div>
              </h2>
              <div id="flush-collapseThree" class="accordion-collapse collapse" data-bs-parent="#accordionFlush">
                <div class="accordion-body">前日12時までにご連絡ください。講師のスケジュール調整が可能な場合は、無料でレッスンの繰越・振替を行うことができます。</div>
              </div>
            </div>
            <div class="accordion-item">
              <h2 class="accordion-header">
                <div class="accordion-button collapsed" data-bs-toggle="collapse" data-bs-target="#flush-collapseFour" aria-expanded="false" aria-controls="flush-collapseFour">
                  Q. 未就学児でも楽しく英語を学ぶことができますか？
                </div>
              </h2>
              <div id="flush-collapseFour" class="accordion-collapse collapse" data-bs-parent="#accordionFlush">
                <div class="accordion-body">１歳児からレッスンを開始している施設様も多くいらっしゃいます。脳の発達や聴覚の柔軟性という点で、０〜３歳ではじめる英語教育はとても効果的であるとされています。</div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <div class="row justify-content-center">
        <div class="col-md-12 text-center">
          <div class="btn-block"><a href="<?php echo esc_url( home_url( '/contact/' ) ); ?>" class="btn-conv">今すぐ無料体験を申し込む</a></div>
        </div>
      </div>

    </div>
  </section>


  <section class="section top-kidsplus anime anime--up">
    <div class="container">
      <div class="row justify-content-between">
        <div class="col-md-3">
          <figure><img src="<?php echo esc_url( home_url() ); ?>/assets/img/kidsplus_logo.png" alt="kids plus"></figure>
        </div>

        <div class="col-md-8">
          <h2>みんなの保育にITでできること</h2>
          <p>kids plusは、「誰もが人生を楽しみ、躍動する機会が得られる社会づくり（ソーシャルインクルージョン）」を目指すソーシャルインクルージョンパートナーズ。
          子ども主体の幼稚園・保育園経営をサポートするため、積極的に課題を見つけ、解決する業務支援サービスを提供しています。</p>
          <p>その一つとして、園施設における英語教育プログラムの提供を始めました。</p>
          <p>ネイティブ講師との英語コミュニケーションのハードルを感じていたり、オンライン教材のデジタル機器の検討・導入に悩みがあったりといった園に対し、最適なソリューションを提供可能。園のカリキュラムへの組み込みもしやすく、導入機器のサポートや保育士への導入レクチャーまで充実しています。</p>
          <span class="btn-link"><a href="https://www.kidsplus.me/" target="_blank" rel="noopener noreferrer">kids plus</a></span>｜<span class="btn-link"><a href="https://www.en-scheduler.com/" target="_blank" rel="noopener noreferrer">enスケジューラ</a></span>
        </div>
      </div>
    </div>
  </section>

</main>
<?php get_footer(); ?>