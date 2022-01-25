var scrollTopRatio;
function getScrollTop(){
    if(document.scrollingElement && document.scrollingElement.scrollHeight){
        scrollTopRatio = $(document).height() / document.scrollingElement.scrollHeight;
    }else{
        scrollTopRatio = 1;
    }
    return $(window).scrollTop() * scrollTopRatio;
}
function aniChecker() {
    $('.ani').each(function(index){
        var pos = $(this).offset(), wY = getScrollTop(), wH = $(window).height(), oH = $(this).outerHeight();
        var posTop = pos.top;
        if (posTop >= wY && oH + posTop <= wY + wH ){
            $(this).addClass('active');
        } else if ((posTop <= wY && posTop + oH > wY) || (posTop  >= wY && posTop  <= wY + wH - 200)){
            $(this).addClass('active');
        } else {
            // �ㅽ겕濡� 踰쀬뼱�ъ쓣�� �좊땲硫붿씠�� �좎�愿���
            if(posTop === wY){
                $(this).addClass('active');
            } else {
               
            }
        }
    });
}
$(window).scroll(function(){
    aniChecker();
});

//�レ옄 移댁슫��
function numberCounter(target_frame, target_number, play_time) {
    this.count = 0; this.diff = 0;
    this.target_count = parseInt(target_number);
    this.target_frame = document.getElementById(target_frame);
    this.timer = null;
    this.play_time= play_time;
    this.counter();
};
numberCounter.prototype.counter = function() {
    var self = this;
    this.diff = this.target_count - this.count;

    if(this.diff > 0) {
        self.count += Math.ceil(this.diff / 5);
    }

    this.target_frame.innerHTML = this.count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    if(this.count < this.target_count) {
        this.timer = setTimeout(function() { self.counter(); }, this.play_time);
    } else {
        clearTimeout(this.timer);
    }
};

// �뚮줈�� �좊땲硫붿씠��
function scrollMoving(obj, start, ratio) {
    var t = function t() {
        var t,
        e = $(window).scrollTop(),
        n = $(obj);
        e + window.innerHeight < n.offset().top || e > n.offset().top + n.height() || (t = (n.offset().top - e + 0.2) / (n.height() + window.innerHeight),
        value = 1 - t, n.css({
            "transform": "translate(-50%," + (start - value * ratio) + "%)"
        }));
    };
    $(window).on("scroll", t), t();
}
function scrollMovingY(obj, start, ratio) {
    var t = function t() {
        var t,
        e = $(window).scrollTop(),
        n = $(obj);
        e + window.innerHeight < n.offset().top || e > n.offset().top + n.height() || (t = (n.offset().top - e + 0.2) / (n.height() + window.innerHeight),
        value = 1 - t, n.css({
            "transform": "translateY(" + (start - value * ratio) + "%) translateX(-50%)"
        }));
    };
    $(window).on("scroll", t), t();
}