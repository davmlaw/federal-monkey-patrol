// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Mon Oct 10 13:44:54 2005

#include "countdowntimer.h"
#include "graphics/2d/text2d.h"
#include <string>

using namespace std;

CountDownTimer::CountDownTimer(int seconds,const string& l):timeStart(seconds),
							    label(l),
							    font(0.2f)
{
    Text2D zero( label + " " + Clock(0).toString(), font ); // 00:00:00
    setWidth(zero.getWidth() );
    setHeight(zero.getHeight() );
}


void CountDownTimer::update(int timePassed)
{
    timeRemaining = timeStart - timePassed;
}


void CountDownTimer::representation(GLfloat alpha)
{
    Text2D text( label + " " + Clock(timeRemaining).toString(), font);
    text.draw(alpha);
}
