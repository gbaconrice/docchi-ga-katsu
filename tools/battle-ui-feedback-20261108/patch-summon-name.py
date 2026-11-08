"""Rename the existing crawler's visible Japanese text without changing its ID or stats."""
def patch(s):
 if 'ゴブリン' not in s and 'シャドウクローラー' in s:return s
 assert '"goblin":"ゴブリン"' in s
 s=s.replace('ゴブリン','シャドウクローラー')
 s=s.replace('シャドウクローラーを召喚','クローラー召喚').replace('シャドウクローラー召喚','クローラー召喚')
 return s
