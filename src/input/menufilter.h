// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun Mar 13 01:19:36 2005
// Last modified: Sun Mar 13 01:19:36 2005

#ifndef MENUFILTER
#define MENUFILTER

#include "input/inputfilter.h"
#include "graphics/timer.h"
#include <iostream>

// update milliseconds...
#define MIN_T 100
#define MINMOVE 0.5f

/**
 * Simple InputFilter, used for menus
 * @see Menu2D
 */
class MenuFilter : public InputFilter {
public:
    MenuFilter(): last_access(0), axis(0.0f, 0.0f), request_skip(false) { };
    ~MenuFilter() { };
    virtual void _read(Input& input);
    bool skip(void) { return request_skip? ready() : false; };
    bool ok(void)   { return ok_pressed? ready() : false; };
    bool up(void)   { return axis.y > MINMOVE? ready() : false;};
    bool down(void) { return axis.y < -MINMOVE? ready() : false; };
    bool right(void){ return axis.x > MINMOVE? ready() : false; };
    bool left(void) { return axis.x < -MINMOVE? ready() : false; };
private:
    bool ready(void) {
	last_access += t.tick();
//	std::cout << "last_access = " << last_access << std::endl;
	if( last_access >= MIN_T ) {
	    last_access = 0;
	    return true;
	}
	return false;
    };
    Timer t;
    Uint32 last_access;
    vector2 axis;
    bool request_skip;
    bool ok_pressed;
};

#endif // MENUFILTER
