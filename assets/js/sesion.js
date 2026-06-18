var tiempoInactividad = 1800000; // 30 minutos
var timer;

function resetTimer() {
    clearTimeout(timer);
    timer = setTimeout(function() {
        window.location.href = "/logout";
    }, tiempoInactividad);
}

["mousemove", "keypress", "click", "scroll", "touchstart"].forEach(function(evento) {
    document.addEventListener(evento, resetTimer);
});

resetTimer();