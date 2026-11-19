// (C) David Lawrence released under the GPL (see license.txt)
// Started:            ? 2004
// Last modified: 02 Jun 2004

#ifndef TIMER_H
#define TIMER_H

#include "../sdl_opengl.h"

/**
 * Get elapsed time in milliseconds
 */
class Timer {
private:
    // Timing variables (in msecs)
    Uint32 last_frame;
public:
    Timer(void);
    ~Timer(void) { };
	/// @return elapsed time in milliseconds since last call
	Uint32 tick(void);
};

#endif
