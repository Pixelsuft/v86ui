# Just run electron


import os
import subprocess


if os.name == 'nt':
    subprocess.call(
        [os.path.join(
            os.getcwd(),
            'node_modules',
            'electron',
            'dist',
            'electron.exe'
        ), os.getcwd()],
        shell=True
    )
else:
    subprocess.call(
        ['npm', 'start'],
        shell=True
    )
