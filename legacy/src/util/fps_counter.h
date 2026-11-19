// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sat Feb  5 21:19:22 2005
// Last modified: Sat Feb  5 21:19:22 2005

#ifndef FPS_COUNTER
#define FPS_COUNTER

/**
 * Collects Frames Per Second statistics
 */
class FPS_Counter {
public:
    FPS_Counter(): frames(0), frames_sum(0), max_frame_length(0), fps(0) { };
    float getFPS(void) { return fps; };
    float getWorstFPS(void);
    void update(unsigned long msecs);
private:
    unsigned long frames;
    unsigned long frames_sum;
    unsigned long max_frame_length;
    float fps;
};

#endif // FPS_COUNTER
