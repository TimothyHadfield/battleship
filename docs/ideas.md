# Data, theory and exploration ideas — Battleship

Tim's words (phase 2): "Brainstorm what additions you can do to the game with data, exploration, theory, etc."

| # | Idea | Build? | Why |
|---|---|---|---|
| 1 | **Live hit-chance heatmap** on the target grid, with the single best square ringed | Build (Play + Paper) | The odds sit right where you choose a square |
| 2 | **Three computers with measured strength** (Random / Hunt & target / Density), shots-to-sink over thousands of games | Build (Lab "How strong?") | Tim's "measured, not guessed" rule |
| 3 | **Shots histogram** for each computer | Build | Shows spread, not just the average |
| 4 | **"Findable" score while you place ships** (Density hunts your exact fleet 40×, percentile vs 300 random fleets) | Build (Play, placing) | Placement analysis right where you place |
| 5 | **Your fleet vs each computer** (60 hunts each, percentile) | Build (Lab) | Full placement analysis |
| 6 | **Is the heatmap honest?** calibration chart (map said X% → really hit Y%) over 800 games | Build (Lab) | Proves the numbers mean what they say |
| 7 | **Hiding styles**: edges / middle / side-by-side / spread vs each computer | Build (Lab) | Answers "where should I hide?" with data |
| 8 | **Where ships hide**: empty-board prior map (middle ≈ 3× corner) | Build (Lab) | Simple explainer of why the first shots go central |
| 9 | **Head to head + first-player edge** in normal and both Salvo styles | Build (Lab) | Salvo first-mover edge (~65%) is a real finding |
| 10 | **Your aim after the game**: your average hit chance vs the best square's | Build (end screen + "your last shot" line) | Study mode: points lost per shot |
| 11 | **Paper companion**: enter a friend's answers on real paper, get the heatmap | Build (Paper tab) | Real-table use |
| 12 | Rule switches' effect (unnamed hits, no-touching) on each computer | Build (Lab) | Shows no-touching helps the shooter |
| 13 | 1967 "advanced Salvo" (only the number of hits) with a correct heatmap | Skip for now | Needs a joint sampler over which shots hit; big job, rare rule |
| 14 | A computer that **hides** smartly (anti-density placement) | Skip | Measured edge-hiding gains ~3 shots; the Lab table already tells players how |
| 15 | Exact joint probabilities (Monte Carlo over whole fleets) instead of per-ship counts | Skip | Calibration chart already sits on the diagonal |
| 16 | Replay a finished game shot by shot with the heatmap of each moment | Skip (later) | Nice but the log + end-screen aim covers the study need |
| 17 | Parity explainer (checkerboard hunting) | Skip | Density already does it implicitly; the prior map shows the idea |
