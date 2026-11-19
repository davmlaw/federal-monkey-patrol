// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sat Feb  5 21:19:22 2005
// Last modified: Sat Feb  5 21:19:22 2005

#include "fps_counter.h"
#include "util.h"

using namespace std;

static const unsigned int AVERAGE_OVER_FRAMES =  200;
static const        float TICKS_IN_A_SECOND   = 1000.0f;


float FPS_Counter::getWorstFPS(void) {
    float worst_fps = 999.99f;
    if( max_frame_length )
	worst_fps = TICKS_IN_A_SECOND / (float)max_frame_length;
    return worst_fps;
}


void FPS_Counter::update(unsigned long msecs)
{
    frames_sum += msecs;
    
    if( ++frames%AVERAGE_OVER_FRAMES == 0 ) {
	float seconds = (float)frames_sum / TICKS_IN_A_SECOND;
	fps = frames / seconds;
	
	frames = 0;
	frames_sum = 0;
	max_frame_length = 0;
    }
    
    max_frame_length = max( msecs, max_frame_length );
}
