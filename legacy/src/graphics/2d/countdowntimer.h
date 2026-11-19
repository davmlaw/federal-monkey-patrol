// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Mon Oct 10 13:44:54 2005

#ifndef COUNTDOWNTIMER_H
#define COUNTDOWNTIMER_H

#include "graphics/2d/drawable2d.h"
#include "util/clock.h"

/**
 * A count down clock overlay
 */
class CountDownTimer : public Drawable2D {
public:
    CountDownTimer(int seconds, const std::string& label = "");
    virtual ~CountDownTimer() { };
    void update(int secondsPassed);
protected:
    void representation(GLfloat alpha);
private:
    int timeStart;
    int timeRemaining;
    std::string label;
    float font;
    // Explicitly disable compiler generated copy functions
    CountDownTimer(const CountDownTimer& rhs);
    CountDownTimer& operator=(const CountDownTimer& rhs);
};

#endif // COUNTDOWNTIMER_H
