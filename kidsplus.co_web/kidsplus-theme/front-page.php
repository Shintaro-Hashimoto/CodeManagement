<?php
/**
 * Template Name: KIDS PLUS Front Page
 */
get_header();
?>

<section class="hero">
  <div class="inner">
    <h1>人とTechnologyでハイタッチ。</h1>
    <p class="lead">
      kids plusは、「人の温かさ」と「テクノロジーの力」で、保育・教育現場に最高の体験を届けます。
      先生・保護者・子どもたちが心地よくつながる仕組みを、現場の声からつくり続けています。
    </p>
    <div class="hero-buttons">
      <a href="#vision" class="btn primary">kids plusについて</a>
      <a href="#services" class="btn">サービスを見る</a>
    </div>
  </div>
</section>

<section id="services">
  <div class="services">
    <article class="service-card svc-kidsplus">
      <h3>KIDS PLUS</h3>
      <p>園と家庭をつなぐICTサービス。保育・教育現場のデジタル化を支えます。</p>
      <a href="#kidsplus">詳しく見る →</a>
    </article>

    <article class="service-card svc-en">
      <h3>enスケジューラ</h3>
      <p>園見学・面談の予約調整を自動化し、先生の時間を守ります。</p>
      <a href="#en">詳しく見る →</a>
    </article>

    <article class="service-card svc-english">
      <h3>KIDS PLUS english</h3>
      <p>子どもが英語を“体験”として自然に楽しめるオンライン英会話。</p>
      <a href="#english">詳しく見る →</a>
    </article>
  </div>
</section>

<section id="vision">
  <div class="vision-layout">
    <div>
      <h2>人とTechnologyでハイタッチ</h2>
      <p>
        kids plusは、「子どもたちの笑顔をふやす」ことを出発点に、保育・教育現場のデジタル化を支援しています。
      </p>
      <p>
        人のあたたかさを大切にしながら、テクノロジーの力で業務の負担を減らし、
        先生・保護者・子どもが心地よくつながる環境をつくります。
      </p>
    </div>
    <div class="vision-image">
      <img src="<?php echo get_template_directory_uri(); ?>/assets/vision.jpg" alt="ビジョンイメージ">
    </div>
  </div>
</section>

<section id="kidsplus">
  <div class="service-detail">
    <div>
      <span class="tag tag-kidsplus">KIDS PLUS</span>
      <div class="title">園と家庭をつなぐICTブランド</div>
      <p>
        KIDS PLUSは、保育・教育現場で生まれる「もっと便利に」「もっと伝わりやすく」を形にするICTサービス群です。
      </p>
      <p>
        先生・保護者が安心してつながれる環境を整え、日々のコミュニケーションをスムーズにします。
      </p>
      <div class="service-btn-wrap">
        <a href="https://www.kidsplus.me" target="_blank" rel="noopener" class="service-text-link">
          サービスサイトを見る
        </a>
      </div>
    </div>
    <div>
      <img src="<?php echo get_template_directory_uri(); ?>/assets/kidsplus.png" alt="KIDS PLUS イメージ">
    </div>
  </div>
</section>

<section id="en">
  <div class="service-detail">
    <div>
      <img src="<?php echo get_template_directory_uri(); ?>/assets/en.png" alt="enスケジューライメージ">
    </div>
    <div>
      <span class="tag tag-en">enスケジューラ</span>
      <div class="title">調整時間をゼロに近づける予約管理</div>
      <p>
        enスケジューラは、「先生たちの時間を、調整作業ではなく“人と向き合う時間”に使ってほしい」という願いから生まれました。
      </p>
      <p>
        カレンダー連携による自動日程調整で、園見学・面談の予約をスムーズに確定できます。
      </p>
      <div class="service-btn-wrap">
        <a href="https://www.en-scheduler.com" target="_blank" rel="noopener" class="service-text-link">
          サービスサイトを見る
        </a>
      </div>
    </div>
  </div>
</section>

<section id="english">
  <div class="service-detail">
    <div>
      <span class="tag tag-english">KIDS PLUS english</span>
      <div class="title">英語の“最初の一歩”を楽しめる体験</div>
      <p>
        KIDS PLUS englishは、子どもたちの「世界とつながるきっかけ」をつくるオンライン英会話サービスです。
      </p>
      <p>
        ネイティブ講師による担任制レッスンで、自然に英語を好きになる体験を提供します。
      </p>
      <div class="service-btn-wrap">
        <a href="https://www.kidsplus.school" target="_blank" rel="noopener" class="service-text-link">
          サービスサイトを見る
        </a>
      </div>
    </div>
    <div>
      <img src="<?php echo get_template_directory_uri(); ?>/assets/english.png" alt="KIDS PLUS english イメージ">
    </div>
  </div>
</section>

<?php get_footer(); ?>