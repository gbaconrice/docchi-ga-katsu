"""Make existing metadata source paths portable; attribution and image bytes stay intact."""
import re

def patch(source):
    count=0
    def replace(m):
        nonlocal count
        parts=m.group('path').split('/')
        if parts[1:3]!=['workspace','shared']:
            return m.group(0)
        count+=1
        return m.group('quote')+'source-provenance/'+'/'.join(parts[3:])+m.group('quote')
    result=re.sub(r'''(?P<quote>["'])(?P<path>/[^"']+)(?P=quote)''',replace,source)
    assert count==57, f'Unexpected source metadata count: {count}'
    return result
