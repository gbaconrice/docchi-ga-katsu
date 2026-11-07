"""Match held gold to the existing winning-gold face, without resizing either."""

MARKER = '/* requested-held-gold-font-match-20261107 */'
CSS = '''
/* requested-held-gold-font-match-20261107 */
/* Match the established earned-result face. Keep 26px size and exact-value scrolling. */
#app #gameScreen > #gameTopline #balance {
  font-family:'Yu Mincho','Hiragino Mincho ProN',Georgia,serif;
  font-weight:900;
  font-style:normal;
}
'''


def patch(source):
    if MARKER in source:
        return source
    assert source.count('</style>') == 1
    # The winning-gold reference must exist. Never alter its established face.
    reference = '''#app #gameScreen #resultPanel[data-earned="true"] #breakdown {
  font-family:'Yu Mincho','Hiragino Mincho ProN',Georgia,serif;
  font-weight:900;'''
    assert reference in source, 'Winning-gold typography changed; inspect before patching.'
    return source.replace('</style>', CSS + '\n</style>', 1)


if __name__ == '__main__':
    import sys
    from pathlib import Path
    src, dst = map(Path, sys.argv[1:])
    assert src.resolve() != dst.resolve()
    dst.write_text(patch(src.read_text()))
