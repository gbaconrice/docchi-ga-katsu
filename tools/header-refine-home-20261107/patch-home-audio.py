"""Hide audio on home only; retain the shared game/room node and listeners."""
CSS = """
/* requested-home-audio-hide-20261107 */
#app #homeScreen > #soundToggle { display:none !important; }
"""
def patch(source):
    assert source.count('</style>') == 1
    assert 'requested-home-audio-hide-20261107' not in source
    return source.replace('</style>', CSS + '\n</style>', 1)
