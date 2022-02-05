

$(document).ready(function(){
    if (checkPublished()) {
    }
    list();
    $('.letter-btn').attr('onclick','post()')
});

function post() {
    let msg = prompt('방명록을 남겨주세요!')
    if (msg === null) {
        return
    }
    msg.replace(';','').replace('\\','')
    $.ajax({
        type: "POST",
        url: "https://spartacodingclub.kr/api/free_newyear_2022/write",
        data: {'mycode':mycode, 'msg':msg},
        success: function (response) {
            alert('방명록을 남겨주셔서 감사합니다!');
            window.location.reload();
        }
    })
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

function checkPublished(){
    return (window.location.href).includes('http');
}

function list() {
    $('.count').hide();
    $.ajax({
        type: "POST",
        url: 'https://spartacodingclub.kr/api/free_newyear_2022/list',
        data: {'mycode':mycode},
        success: function (response) {
            let count = response['msgs'].length;
            $('.count-num').text(`${count}개`);
            $('.count').show();
            for (let i = 0; i < count; i++) {
                let text = response['msgs'][i]['text']
                let icon_url = response['msgs'][i]['icon']

                let x = response['msgs'][i]['x']
                let y = response['msgs'][i]['y']
                let _id = response['msgs'][i]['_id']

                let temp_html = `<img id="${_id}" onclick="alert('${text}')" style="position: absolute;cursor:pointer; left: calc(50% + ${x}px); bottom: calc(50% + ${y}px);" src="https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/240/apple/285/envelope_2709-fe0f.png">`
                $('.letter-box').append(temp_html);
            }
        }
    })
}



