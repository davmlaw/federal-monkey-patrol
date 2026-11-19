#include "timer.h"
#include <iostream>


Timer::Timer(void)
{
    last_frame = SDL_GetTicks();
}


Uint32 Timer::tick(void)
{
    Uint32 now = SDL_GetTicks();
    Uint32 frame_length = now - last_frame;
    last_frame = now; // used next call to tick()
    return frame_length;
}
