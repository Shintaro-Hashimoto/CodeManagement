$(function () {
	setTimeout(() => {
		location.reload();
	}, 1800000); //3分間隔でreroad

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
		//選択ステータスのデータカウント
		var cnt = 1;
		//agentのwrap要素divの数
		var wrapBoxCnt = 0;
		//dev.row内のmaxAgent数
		var agentBoxNum = 3;
		//1つのdev.row内のagent数カウント
		var agentNum = 1;

		//要素の総数取得
		var dataNum = 0;


		//ステータスで絞り込み
		var tmpItems = {};
		//全体カウント
		let num_all = 0;
		//statusごとの人数
		let num_off = 0;
		let num_on = 0;
		$.each(data, function (k, v) {

			if (v.status === 0) {
				num_off++;
			} else {
				num_on++
			}

			//指定のステータスで形成
			if (reqParam.status == 'all' || v.status == reqParam.status) {
				tmpItems[k] = v;
			}
			num_all++;
		});

		//所属で絞り込み
		var items = {};
		$.each(tmpItems, function (i, d) {
			if (reqParam.agentHrc == 'all' || d.agentHRC == reqParam.agentHrc) {
				items[i] = d;
				dataNum++;
			}
		});

		if (dataNum === 0) {
			$('#item-container').empty();
			$('#sel_agentHrc').empty();
			$('#sel_agentHrc').append('<option value="all">ALL</option>');
			return;
		}

		var padObjCnt = agentBoxNum - (dataNum % 3);
		var agentHrcAry = [];



		//dataがサーバから受け取るjson値
		$.each(items, function (key, val) {

			if (agentNum <= 1) {
				if (wrapBoxCnt == 0) {
					$('#item-container').empty();
				}
				$('<div class="row box' + wrapBoxCnt + '"></div>').appendTo('#item-container');
			}

			//agent数が3人まで同一box
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
				var htm = '';
				htm += '<div class="col-sm-3 m-sm-auto status' + val.status + '">';
				htm += '<div class="row align-items-center">';
				htm += '<div class="col-4"><span class="user agent' + val.connect_status + '"></span></div>';
				htm += '<div class="col-8"><h3>' + val.username + '<br><small>' + agentHrc + '</small></h3><p>' + val.timestamp + '  ' + val.message + '</p></div></div></div>';
				$(htm).appendTo('#item-container .box' + wrapBoxCnt);
			}

			//1つのdev.row内のagent数が3人なら空divを挿入
			if (agentNum == agentBoxNum) {
				$('<div class="row-50"></div>').appendTo('#item-container');
				agentNum = 0;
				wrapBoxCnt++;
			}

			//最後の要素の時、box内agentが3人以下なら空要素で埋める
			if (cnt == dataNum) {
				var cls = '.row.box' + wrapBoxCnt;
				for (x = 0; padObjCnt > x; x++) {
					$('<div class="col-sm-3 m-sm-auto"></div>').appendTo(cls);
				}
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
		//絞り込み値作成
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
