$(function () {
    // ページ全体の自動リロードはキャッシュ問題を引き起こすため、コメントアウト
    // setTimeout(() => {
    //     location.reload();
    // }, 1800000);

    var topBtn = $('.to-top');
    topBtn.hide();
    //スクロールしてページトップから100に達したらボタンを表示
    $(window).scroll(function () {
        if ($(this).scrollTop() > 100) {
            topBtn.fadeIn();
        } else {
            topBtn.fadeOut();
        }
    });
    //フッター手前でボタンを止める
    $(window).scroll(function () {
        var height = $(document).height(); //ドキュメントの高さ 
        var position = $(window).height() + $(window).scrollTop(); //ページトップから現在地までの高さ
        var footer = $("footer").height(); //フッターの高さ
        if (height - position <= footer) {
            topBtn.css({
                position: "fixed",
                bottom: (footer * 2) + 10
            });
        } else {
            topBtn.css({
                position: "fixed",
                top: "auto"
            });
        }
    });
    //スクロールしてトップへ戻る
    topBtn.click(function () {
        $('body,html').animate({
            scrollTop: 0
        }, 500);
        return false;
    });

    // AgentStatusチェック
    $('input[name="check"]').change(function () {
        getRequestParam();
    });

    // 所属プルダウン
    $('#sel_agentHrc').change(function () {
        getRequestParam();
    });

    //reflesh
    $('#manual-reload').on('click', function () {
        getRequestParam();
    });

    // 初回読み込みを実行
    getRequestParam();
    
    /* ★ 修正点: 自動更新の設定 ★ */
    // 600000ミリ秒（＝10分）ごとに getRequestParam を呼び出して表示を自動更新
    setInterval(getRequestParam, 600000); 

});

function getRequestParam() {
    //stausチェックボックスの状態
    var status_val = $('input[name="check"]:checked').val();

    //所属
    var agentHrc_vel = $('#sel_agentHrc option:selected').val();

    var prm = {
        status: status_val,
        agentHrc: agentHrc_vel
    }

    var url = "./json/status.json";
    searchJson(url, prm);
}

function searchJson(url, reqParam) {
    $.getJSON(url, data => {
        var lineContainer = '';
        var cnt = 1;
        var wrapBoxCnt = 0;
        var agentBoxNum = 3;
        var agentNum = 1;

        var dataNum = 0;

        var tmpItems = {};
        let num_all = 0;
        let num_off = 0;
        let num_on = 0;
        $.each(data, function (k, v) {
            if (v.status === 0) {
                num_off++;
            } else {
                num_on++;
            }
            if (reqParam.status == 'all' || v.status == reqParam.status) {
                tmpItems[k] = v;
            }
            num_all++;
        });

        var items = {};
        $.each(tmpItems, function (i, d) {
            if (reqParam.agentHrc == 'all' || d.agentHRC == reqParam.agentHrc) {
                items[i] = d;
                dataNum++;
            }
        });

        if (dataNum === 0) {
            $('#item-container').empty();
            $('#item-container').html('<div class="col-12 text-center"><p>表示するエージェントがいません。</p></div>');
            // 所属リストが空にならないように調整
            if ($('#sel_agentHrc option').length <= 1) {
                var agentHrcAryAll = [];
                $.each(data, function(key, val){
                    if(val.agentHRC && $.inArray(val.agentHRC, agentHrcAryAll) === -1) {
                        agentHrcAryAll.push(val.agentHRC);
                    }
                });
                agentHrcAryAll.sort();
                $('#sel_agentHrc').find('option:not(:first)').remove();
                $.each(agentHrcAryAll, function (index, value) {
                    $('#sel_agentHrc').append('<option value="' + value + '">' + value + '</option>');
                });
            }
            return;
        }

        var padObjCnt = agentBoxNum - (dataNum % 3);
        var agentHrcAry = [];

        $.each(items, function (key, val) {
            if (agentNum <= 1) {
                if (wrapBoxCnt == 0) {
                    $('#item-container').empty();
                }
                $('<div class="row box' + wrapBoxCnt + '"></div>').appendTo('#item-container');
            }

            if (agentNum <= agentBoxNum) {
                var agentHrc = '所属：';
                if (val.agentHRC) {
                    agentHrc += val.agentHRC;
                    if ($.inArray(val.agentHRC, agentHrcAry) === -1) {
                        agentHrcAry.push(val.agentHRC);
                    }
                }
                if (!val.connect_status) {
                    val.connect_status = val.status;
                }

                let iconClass = 'fa-user-times';
                if (val.connect_status === 1) iconClass = 'fa-user-check';
                else if (val.connect_status === 2) iconClass = 'fa-phone';
                else if (val.connect_status === 3) iconClass = 'fa-phone-volume';
                
                let durationStr = '';
                if (val.timestamp) {
                    const year = new Date().getFullYear();
                    const timeObj = moment(year + "/" + val.timestamp.replace(' ', '/'), "YYYY/MM/DD/HH:mm");
                    if (timeObj.isValid()) {
                        const duration = moment.duration(moment().diff(timeObj));
                        const hours = Math.floor(duration.asHours());
                        const minutes = duration.minutes();
                        durationStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                    }
                }
                
                var htm = `
                    <div class="col-sm-4 agent-card-wrapper">
                        <div class="agent-card status-${val.status}">
                            <div class="row align-items-center">
                                <div class="col-3">
                                    <div class="status-icon">
                                        <i class="fas ${iconClass}"></i>
                                    </div>
                                </div>
                                <div class="col-9">
                                    <h5>
                                        ${val.username}
                                        <br>
                                        <small>${agentHrc.replace('所属：', '')}</small>
                                    </h5>
                                    <div class="status-duration">
                                        <i class="far fa-clock"></i> ${durationStr}
                                    </div>
                                    <p class="status-message">${val.message} <small>(${val.timestamp})</small></p>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                $(htm).appendTo('#item-container .box' + wrapBoxCnt);
            }

            if (agentNum == agentBoxNum) {
                agentNum = 0;
                wrapBoxCnt++;
            }
            
            cnt++;
            agentNum++;
        });

        $('span.num_all').text(num_all);
        $('span.num_0').text(num_off);
        $('span.num_1').text(num_on);

        agentHrcAry.sort();
        $('#sel_agentHrc').empty();
        $('#sel_agentHrc').append('<option value="all">ALL</option>');
        $.each(agentHrcAry, function (index, value) {
            var sel = '';
            if (reqParam.agentHrc === value) {
                sel = 'selected';
            }
            var htm = '<option value="' + value + '" ' + sel + '>' + value + '</option>';
            $('#sel_agentHrc').append(htm);
        });
    });
}