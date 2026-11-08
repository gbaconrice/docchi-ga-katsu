"""Keep handled optional portrait failures out of startup/runtime diagnostics."""

def patch(s):
    assert 'avatar-resource-fallback-20261108' not in s, 'Already patched'
    # These are the participant rail, prediction picks, and (when applied) lobby.
    # Mark only existing avatar paths that already install a fallback onerror.
    needle="img.referrerPolicy='no-referrer';"
    lines=s.splitlines(keepends=True)
    count=0
    for i,line in enumerate(lines):
        if needle not in line:
            continue
        assert "img.onerror=" in line and "fallback.hidden=false" in line, 'Avatar path has no handled fallback'
        count+=line.count(needle)
        lines[i]=line.replace(needle,needle+"img.setAttribute('data-avatar-fallback','true');")
    assert count in (2,3), 'Expected rail/picks and optional lobby avatar paths'
    s=''.join(lines)
    target='  function report(event) {\n'
    assert s.count(target)==1, 'Expected one boot diagnostics handler'
    replacement=target+'''    // avatar-resource-fallback-20261108: this optional image has its own fallback.
    // Do not swallow ErrorEvent/runtime details, unknown resources, SCRIPT or LINK.
    var target = event.target;
    if (target && target.tagName === 'IMG' && target.getAttribute &&
        target.getAttribute('data-avatar-fallback') === 'true' && typeof target.onerror === 'function' &&
        !event.filename && !event.message && !event.error) return;
'''
    return s.replace(target,replacement,1)

if __name__=='__main__':
    import pathlib,sys
    source=pathlib.Path(sys.argv[1]);output=pathlib.Path(sys.argv[2]);output.parent.mkdir(parents=True,exist_ok=True);output.write_text(patch(source.read_text()))
