"""Place prediction and clock below the enlarged round label inside the existing header."""
def patch(s):
 if 'id="roundSummary"' in s:return s
 status='<p id="status" class="round-status" aria-live="polite">第1／10戦</p>'
 choice='<span id="battleChoice" class="battle-choice" hidden></span>'
 clock='<p id="battleClock" class="battle-clock" aria-live="off"></p>'
 for text in [status,choice,clock]:assert s.count(text)==1,text
 s=s.replace(choice,'').replace(clock,'')
 s=s.replace(status,'<div id="roundSummary" class="round-summary">'+status+'<div class="round-summary-meta">'+choice+clock+'</div></div>')
 css='''
/* The round and its prediction/clock share the existing upper frame. */
#app #gameScreen > #gameTopline.game-topline {
 grid-template-columns:minmax(0,1fr) max-content minmax(0,1fr);
 column-gap:8px;
}
#app #gameScreen > #gameTopline #fieldStatus { grid-column:1; max-width:100%; }
#app #gameScreen > #gameTopline .wallet-pill { grid-column:3; width:auto; max-width:100%; }
#app #gameScreen > #gameTopline #roundSummary {
 grid-column:2; grid-row:1; display:grid; grid-template-columns:minmax(0,1fr);
 grid-template-rows:22px 16px; align-items:center; justify-items:center; min-width:0;
}
#app #gameScreen > #gameTopline #roundSummary #status {
 grid-column:1; grid-row:1; margin:0; font-size:18px; font-weight:700; line-height:22px;
}
#app #gameScreen > #gameTopline .round-summary-meta {
 grid-column:1; grid-row:2; display:flex; align-items:center; justify-content:center;
 gap:6px; min-width:0; white-space:nowrap;
}
#app #gameScreen > #gameTopline #battleChoice,
#app #gameScreen > #gameTopline #battleClock {
 position:static; display:block; width:auto; min-width:0; max-width:none; height:auto;
 margin:0; padding:0; color:#f6e7cb; font-size:11px; font-weight:500; line-height:16px;
 white-space:nowrap; overflow:visible; background:none; border:0; text-align:center;
}
#app #gameScreen > #gameTopline #battleChoice[hidden] { display:none; }
'''
 assert s.count('</style>')==1;s=s.replace('</style>',css+'\n</style>')
 return s
