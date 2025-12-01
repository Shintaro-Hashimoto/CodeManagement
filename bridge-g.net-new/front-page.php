<?php get_header(); ?>

<main class="w-full">

    <?php if ( have_posts() ) : while ( have_posts() ) : the_post(); ?>

        <?php
        // テーマフォルダ内の images/home.jpg を背景画像として指定
        $bg_image_url = get_template_directory_uri() . '/images/home.jpg';
        ?>

        <!-- メインビジュアルエリア -->
        <section class="relative h-[60vh] flex items-center justify-center bg-cover bg-center" style="background-image: url('<?php echo esc_url($bg_image_url); ?>');">
            
            <!-- 文字を読みやすくするための白透過フィルター -->
            <div class="absolute inset-0 bg-white/50 backdrop-blur-[1px]"></div>

            <!-- コンテンツ -->
            <div class="relative z-10 text-center px-6 fade-in pb-16">
                <p class="text-sm font-bold text-gray-600 tracking-[0.2em] mb-4 uppercase">Connecting Value</p>
                <h2 class="text-3xl md:text-5xl font-light leading-tight text-gray-900 mb-6">
                    架け橋となる、<br>
                    確かな価値を。
                </h2>
                <div class="w-12 h-0.5 bg-gray-500 mx-auto"></div>
            </div>

            <!-- ▼▼▼ 波線（SVGセパレータ） ▼▼▼ -->
            <!-- bottom-0 で下端に配置し、text-white で白く塗りつぶします -->
            <div class="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-20 text-white">
                <svg class="relative block w-full h-[60px] md:h-[120px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" preserveAspectRatio="none">
                    <!-- 下側を塗りつぶすタイプの波形データに変更しました -->
                    <path fill="currentColor" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,261.3C960,256,1056,224,1152,213.3C1248,203,1344,213,1392,218.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                </svg>
            </div>
            <!-- ▲▲▲ 追加ここまで ▲▲▲ -->

        </section>

        <!-- コンテンツエリア -->
        <!-- マイナスマージン(-mt-1)で隙間対策をしつつ、ここから下は白背景 -->
        <div class="bg-white relative z-10 -mt-1">
            <div class="max-w-3xl mx-auto px-6 py-20">
                <?php the_content(); ?>
            </div>
        </div>

    <?php endwhile; endif; ?>

</main>

<?php get_footer(); ?>