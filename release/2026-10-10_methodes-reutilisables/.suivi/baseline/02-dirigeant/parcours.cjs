// Reproduction des premiers clics observés, écrite après la découverte indépendante.
// PATH=/tmp/tricorder-xvfb/usr/bin:$PATH xvfb-run -a node parcours.cjs
const {spawn}=require('child_process');const fs=require('fs');const path=require('path');
const child=spawn(process.execPath,[path.join(__dirname,'decouverte.cjs')],{stdio:['pipe','inherit','inherit']});
child.stdin.end(fs.readFileSync(path.join(__dirname,'actions.jsonl')));child.on('exit',code=>process.exit(code??1));
