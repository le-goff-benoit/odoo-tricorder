// One application, one window; workflows and terminal share its lifecycle.
require('./output-streams.cjs').protectStandardOutput();
require('./main.cjs');
