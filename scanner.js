$(function () {
    // LIFF初期化
    liff
        .init({
            liffId: '1655194342-dJrw69Jr'
        })
        .then(() => {
            // LIFF用の処理はここに書く
        })
        .catch((err) => {
            $('#log')[0].innerText = 'LIFF init failed.\n' + err;
        });
    // スキャナー起動
    startScanner();
});

const startScanner = () => {
    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#photo-area'),
            constraints: {
                decodeBarCodeRate: 3,
                successTimeout: 500,
                codeRepetition: true,
                tryVertical: false,
                frameRate: 15,
                width: 640,
                height: 480,
                facingMode: "environment"
            },
        },
        decoder: {
            readers: [
                "ean_reader"
            ]
        },
    }, function (err) {
        if (err) {
            $('#log')[0].innerText = 'Quagga init failed.\n' + err;
            return;
        }
        //エラーが無ければ起動
        Quagga.start();
    });

    // バーコードを検出したときの処理
    Quagga.onProcessed(function (result) {
        var drawingCtx = Quagga.canvas.ctx.overlay,
            drawingCanvas = Quagga.canvas.dom.overlay;

        if (result) {
            // 認識したバーコードを囲む
            if (result.boxes) {
                drawingCtx.clearRect(0, 0, parseInt(drawingCanvas.getAttribute("width")), parseInt(drawingCanvas.getAttribute("height")));
                result.boxes.filter(function (box) {
                    return box !== result.box;
                }).forEach(function (box) {
                    Quagga.ImageDebug.drawPath(box, {
                        x: 0,
                        y: 1
                    }, drawingCtx, {
                        color: "white",
                        lineWidth: 2
                    });
                });
            }
            // 読み取ったバーコードを囲む
            if (result.box) {
                Quagga.ImageDebug.drawPath(result.box, {
                    x: 0,
                    y: 1
                }, drawingCtx, {
                    color: "#01f965",
                    lineWidth: 2
                });
            }
            // 読み取ったバーコードに線を引く
            if (result.codeResult && result.codeResult.code) {
                Quagga.ImageDebug.drawPath(result.line, {
                    x: 'x',
                    y: 'y'
                }, drawingCtx, {
                    color: '#00b900',
                    lineWidth: 2
                });
            }
        }
    });
    
    let scanResults = [];
    let resultBuffer = [];

    // 検知後の処理
    Quagga.onDetected(function (result) {
        // １つでもエラー率0.19以上があれば除外
        let isErr = false
        $.each(result.codeResult.decodedCodes, function (id, error) {
            if (error.error != undefined) {
                if (parseFloat(error.error) > 0.19) {
                    isErr = true;
                }
            }
        })
        if (isErr) return;

        // エラー率の中央値が0.1以上なら除外
        const errors = result.codeResult.decodedCodes.filter((_) => _.error !== undefined).map((_) => _.error);
        const median = _getMedian(errors);
        if (median > 0.1) {
            return;
        }

        // 3連続で同じ値だった場合のみ採用
        scanResults.push(result.codeResult.code);
        if (scanResults.length < 3) {
            return;
        }
        if (scanResults[0] !== scanResults[1]) {
            scanResults.shift()
            return;
        }

        // 複数回目は前回と値が違う時だけ発火
        if (resultBuffer.length > 0) {
            if (resultBuffer.slice(-1)[0] === result.codeResult.code) {
                return;
            }
        }

        resultBuffer.push(result.codeResult.code);
        $('#result')[0].value = result.codeResult.code;

        if (confirm(result.codeResult.code)) {
            document.dispatchEvent(event);
        }
    });

    // 中央値を取得
    function _getMedian(arr) {
        arr.sort((a, b) => a - b)
        const half = Math.floor(arr.length / 2)
        if (arr.length % 2 === 1)
            return arr[half]
        return (arr[half - 1] + arr[half]) / 2.0
    }

}