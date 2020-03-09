<template lang="html">

  <div id="intro">

    <div class="code-container">
      <div class="code-text">
        <h3>Event Tracking & Event Sourcing</h3>
        You can track events and react to their values. With Subspace observables doing event sourcing is easy.
      </div>
      <div class="code-content">

        <div class="language-js line-numbers-mode"><pre class="language-js"><code><span class="token keyword">import</span> <span class="token punctuation">{</span> $average<span class="token punctuation">,</span> $latest <span class="token punctuation">}</span> <span class="token keyword">from</span> <span class="token string">"@embarklabs/subspace"</span><span class="token punctuation">;</span>

<span class="token keyword">const</span> rating$ <span class="token operator">=</span> Product<span class="token punctuation">.</span>events<span class="token punctuation">.</span><span class="token function">Rating</span><span class="token punctuation">.</span><span class="token function">track</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">map</span><span class="token punctuation">(</span><span class="token string">"rating"</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

rating$<span class="token punctuation">.</span><span class="token function">pipe</span><span class="token punctuation">(</span><span class="token function">$latest</span><span class="token punctuation">(</span><span class="token number">5</span><span class="token punctuation">)</span><span class="token punctuation">,</span> <span class="token function">$average</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">subscribe</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token parameter">rating</span><span class="token punctuation">)</span> <span class="token operator">=&gt;</span> <span class="token punctuation">{</span>
  console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token string">"average rating of the last 5 events is "</span> <span class="token operator">+</span> rating<span class="token punctuation">)</span>
<span class="token punctuation">}</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  </code></pre> <div class="line-numbers-wrapper"><span class="line-number">1</span><br><span class="line-number">2</span><br><span class="line-number">3</span><br><span class="line-number">4</span><br><span class="line-number">5</span><br><span class="line-number">6</span><br><span class="line-number">7</span><br></div></div>

      </div>
    </div>

    <div class="code-container">
      <div class="code-text">
        <h3>Tracking State</h3>
        You can track changes to a contract state variable, by specifying the view function and arguments to call and query the contract.
      </div>
      <div class="code-content">

        <div class="language-js line-numbers-mode"><pre class="language-js"><code><span class="token keyword">const</span> productTitle$ <span class="token operator">=</span> ProductList<span class="token punctuation">.</span>methods<span class="token punctuation">.</span><span class="token function">products</span><span class="token punctuation">(</span><span class="token number">0</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">track</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">map</span><span class="token punctuation">(</span><span class="token string">"title"</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
productTitle$<span class="token punctuation">.</span><span class="token function">subscribe</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token parameter">title</span><span class="token punctuation">)</span> <span class="token operator">=&gt;</span> console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token string">"product title is "</span> <span class="token operator">+</span> title<span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
  </code></pre> <div class="line-numbers-wrapper"><span class="line-number">1</span><br><span class="line-number">2</span><br></div></div>

      </div>
    </div>

    <div class="code-container">
      <div class="code-text">
        <h3>Tracking balances</h3>
        You can also track changes in both ETH and ERC20 token balances
      </div>
      <div class="code-content">

        <div class="language-js line-numbers-mode"><pre class="language-js"><code><span class="token keyword">const</span> address <span class="token operator">=</span> <span class="token string">"0x0001020304050607080900010203040506070809"</span><span class="token punctuation">;</span>

subspace<span class="token punctuation">.</span><span class="token function">trackBalance</span><span class="token punctuation">(</span>address<span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">subscribe</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token parameter">balance</span><span class="token punctuation">)</span> <span class="token operator">=&gt;</span> <span class="token punctuation">{</span>
  console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token string">"ETH balance is "</span><span class="token punctuation">,</span> balance<span class="token punctuation">)</span>
<span class="token punctuation">}</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

subspace<span class="token punctuation">.</span><span class="token function">trackBalance</span><span class="token punctuation">(</span>address, <span class="token string">"0x744d70fdbe2ba4cf95131626614a1763df805b9e"</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">subscribe</span><span class="token punctuation">(</span><span class="token punctuation">(</span><span class="token parameter">balance</span><span class="token punctuation">)</span> <span class="token operator">=&gt;</span> <span class="token punctuation">{</span>
  console<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token string">"SNT balance is "</span><span class="token punctuation">,</span> balance<span class="token punctuation">)</span>
<span class="token punctuation">}</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

</code></pre> <div class="line-numbers-wrapper"><span class="line-number">1</span><br><span class="line-number">2</span><br><span class="line-number">3</span><br><span class="line-number">4</span><br><span class="line-number">5</span><br><span class="line-number">6</span><br><span class="line-number">7</span><br><span class="line-number">8</span><br><span class="line-number">9</span><br></div></div>

      </div>
    </div>

    <div class="code-container">
      <div class="code-text">
        <h3>React Integration</h3>
        Subspace can make any react component compatible with observables so you easily reactive components
      </div>
      <div class="code-content">

<div class="language-js line-numbers-mode"><pre class="language-js"><code><span class="token keyword">import</span> <span class="token punctuation">{</span> observe <span class="token punctuation">}</span> <span class="token keyword">from</span> <span class="token string">"@embarklabs/subspace/react"</span><span class="token punctuation">;</span>

<span class="token keyword">const</span> <span class="token function-variable function">ProductComponent</span> <span class="token operator">=</span> <span class="token punctuation">(</span><span class="token parameter"><span class="token punctuation">{</span> maxRating<span class="token punctuation">,</span> minRating<span class="token punctuation">,</span> averageRating <span class="token punctuation">}</span></span><span class="token punctuation">)</span> <span class="token operator">=&gt;</span> <span class="token punctuation">{</span>
  <span class="token keyword">return</span> <span class="token operator">&lt;</span>ul<span class="token operator">&gt;</span>
    <span class="token operator">&lt;</span>li<span class="token operator">&gt;</span><span class="token operator">&lt;</span>b<span class="token operator">&gt;</span>minimum rating<span class="token punctuation">:</span> <span class="token operator">&lt;</span><span class="token operator">/</span>b<span class="token operator">&gt;</span> <span class="token punctuation">{</span>minRating<span class="token punctuation">}</span><span class="token operator">&lt;</span><span class="token operator">/</span>li<span class="token operator">&gt;</span>
    <span class="token operator">&lt;</span>li<span class="token operator">&gt;</span><span class="token operator">&lt;</span>b<span class="token operator">&gt;</span>maximum rating<span class="token punctuation">:</span> <span class="token operator">&lt;</span><span class="token operator">/</span>b<span class="token operator">&gt;</span> <span class="token punctuation">{</span>maxRating<span class="token punctuation">}</span><span class="token operator">&lt;</span><span class="token operator">/</span>li<span class="token operator">&gt;</span>
    <span class="token operator">&lt;</span>li<span class="token operator">&gt;</span><span class="token operator">&lt;</span>b<span class="token operator">&gt;</span>average rating<span class="token punctuation">:</span> <span class="token operator">&lt;</span><span class="token operator">/</span>b<span class="token operator">&gt;</span> <span class="token punctuation">{</span>averageRating<span class="token punctuation">}</span><span class="token operator">&lt;</span><span class="token operator">/</span>li<span class="token operator">&gt;</span>
  <span class="token operator">&lt;</span><span class="token operator">/</span>ul<span class="token operator">&gt;</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span><span class="token punctuation">;</span>

<span class="token keyword">const</span> ReactiveProductComponent <span class="token operator">=</span> <span class="token function">observe</span><span class="token punctuation">(</span>ProductComponent<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> Product <span class="token operator">=</span> subspace<span class="token punctuation">.</span><span class="token function">contract</span><span class="token punctuation">(</span><span class="token punctuation">{</span>abi<span class="token punctuation">,</span> address<span class="token punctuation">}</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">const</span> rating$ <span class="token operator">=</span> Product<span class="token punctuation">.</span>events<span class="token punctuation">.</span>Rating<span class="token punctuation">.</span><span class="token function">track</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">map</span><span class="token punctuation">(</span><span class="token string">"rating"</span><span class="token punctuation">)</span><span class="token punctuation">.</span><span class="token function">pipe</span><span class="token punctuation">(</span><span class="token function">map</span><span class="token punctuation">(</span><span class="token parameter">x</span> <span class="token operator">=&gt;</span> <span class="token function">parseInt</span><span class="token punctuation">(</span>x<span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

ReactDOM<span class="token punctuation">.</span><span class="token function">render</span><span class="token punctuation">(</span>
  <span class="token operator">&lt;</span>ReactiveProductComponent
    maxRating<span class="token operator">=</span><span class="token punctuation">{</span>rating$<span class="token punctuation">.</span><span class="token function">pipe</span><span class="token punctuation">(</span><span class="token function">$max</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">}</span>
    minRating<span class="token operator">=</span><span class="token punctuation">{</span>rating$<span class="token punctuation">.</span><span class="token function">pipe</span><span class="token punctuation">(</span><span class="token function">$min</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">}</span>
    averageRating<span class="token operator">=</span><span class="token punctuation">{</span>rating$<span class="token punctuation">.</span><span class="token function">pipe</span><span class="token punctuation">(</span><span class="token function">$average</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">}</span>
  <span class="token operator">/</span><span class="token operator">&gt;</span><span class="token punctuation">,</span>
  document<span class="token punctuation">.</span><span class="token function">getElementById</span><span class="token punctuation">(</span><span class="token string">'hello-example'</span><span class="token punctuation">)</span>
<span class="token punctuation">)</span><span class="token punctuation">;</span>
  </code></pre> <div class="line-numbers-wrapper"><span class="line-number">1</span><br><span class="line-number">2</span><br><span class="line-number">3</span><br><span class="line-number">4</span><br><span class="line-number">5</span><br><span class="line-number">6</span><br><span class="line-number">7</span><br><span class="line-number">8</span><br><span class="line-number">9</span><br><span class="line-number">10</span><br><span class="line-number">11</span><br><span class="line-number">12</span><br><span class="line-number">13</span><br><span class="line-number">14</span><br><span class="line-number">15</span><br><span class="line-number">16</span><br><span class="line-number">17</span><br><span class="line-number">18</span><br><span class="line-number">19</span><br><span class="line-number">20</span><br><span class="line-number">21</span><br><span class="line-number">22</span><br><span class="line-number">23</span><br></div></div>

      </div>
    </div>

  </div>

</template>

<script>
export default {};
</script>

<style lang="css" scoped>
.cls-1 {
  fill: url(#linear-gradient-404);
}

.cls-2,
.cls-6 {
  opacity: 0.65;
}

.cls-2 {
  fill: url(#linear-gradient-404-2);
}

.cls-3 {
  fill: url(#linear-gradient-404-3);
}

.cls-4 {
  fill: url(#linear-gradient-404-4);
}

.cls-5 {
  fill: url(#linear-gradient-404-5);
}

.cls-6 {
  fill: url(#linear-gradient-404-6);
}

.cls-7 {
  fill: url(#linear-gradient-404-7);
}

.cls-8 {
  fill: #e2e2e2;
}

.cls-9 {
  fill: #cecece;
}

.cls-10 {
  fill: #f2f2f2;
}

.cls-11 {
  fill: #eaeaea;
}

.cls-12 {
  fill: #39b44a;
}

.cls-13 {
  fill: #c59b6d;
}

.cls-14 {
  fill: #a57c52;
}

.cls-15 {
  fill: #009145;
}

.cls-16 {
  fill: url(#linear-gradient-404-8);
}

.cls-17 {
  fill: url(#linear-gradient-404-9);
}

.cls-18,
.cls-19 {
  fill: #fff;
}

.cls-18 {
  opacity: 0.26;
}

.cls-20 {
  fill: #282828;
}

.cls-21 {
  fill: #2d2d2d;
}

.cls-22,
.cls-23,
.cls-27,
.cls-28,
.cls-29 {
  fill: none;
}

.cls-22,
.cls-23 {
  stroke: #ecf4f8;
  stroke-linecap: round;
  stroke-width: 0.96px;
}

.cls-22 {
  stroke-linejoin: round;
}

.cls-23,
.cls-27,
.cls-28,
.cls-29 {
  stroke-miterlimit: 10;
}

.cls-24 {
  fill: #ecf4f8;
}

.cls-25 {
  fill: #ff0;
}

.cls-26 {
  fill: aqua;
}

.cls-27 {
  stroke: #fbed21;
}

.cls-27,
.cls-28,
.cls-29 {
  stroke-width: 8px;
}

.cls-28 {
  stroke: #ec1e79;
}

.cls-29 {
  stroke: lime;
}

.cls-30 {
  fill: url(#linear-gradient-404-10);
}

.cls-31 {
  opacity: 0.12;
}

.cls-32 {
  opacity: 0.15;
}

.cls-33 {
  opacity: 0.18;
}

.cls-34 {
  opacity: 0.33;
}
</style>
