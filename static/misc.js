const CHRISTMAS_HTML = `\
<div class="snowflake">
    <p><span style="font-size:120%;">🎄</span><br></p>
</div>
<div class="snowflake">
    <p><span style="font-size:110%;">🎄</span><br></p>
</div>
<div class="snowflake">
    <p><span style="font-size:150%;">🌟</span><br></p>
</div>
<div class="snowflake">
    <p><span style="font-size:130%;">⭐️</span><br></p>
</div>
<div class="snowflake">
    <p><span style="font-size:115%;">🎁</span><br></p>
</div>
<div class="snowflake">
    <p><span style="font-size:125%;">🎄</span><br></p>
</div>
<div class="snowflake">
    <p><span style="font-size:90%;">🎄</span><br></p>
</div>
<div class="snowflake">
    <p><span style="font-size:140%;">🌟</span><br></p>
</div>
<div class="snowflake">
    <p><span style="font-size:135%;">⭐️</span><br></p>
</div>
<div class="snowflake">
    <p>🎁<br></p>
</div>
<div class="snowflake">
    <p>🎁<br></p>
</div>
<div class="snowflake">
    <p><span style="font-size:95%;">🎄</span><br></p>
</div>`

function addSnowflake() {
    let link = document.createElement('link')
    link.href = '/static/christmas.css'
    link.rel = 'stylesheet'
    link.type = 'text/css'
    document.head.appendChild(link)

    let snowFlakes = document.createElement('div')
    snowFlakes.classList.add('snowflakes')
    snowFlakes.innerHTML = CHRISTMAS_HTML
    document.body.appendChild(snowFlakes)
}

export default { addSnowflake }
