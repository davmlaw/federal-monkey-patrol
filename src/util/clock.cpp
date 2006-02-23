// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Mon Oct 10 11:42:00 2005

#include "clock.h"

using namespace std;

Clock::Clock(int s)
{
    setClock(0,0,s);
}

Clock::Clock(int m, int s)
{
    setClock(0,m,s);
}

Clock::Clock(int h, int m, int s)
{
    setClock(h,m,s);
}


std::string Clock::toString()
{
    char cstr[16];
    sprintf(cstr, "%02d:%02d:%02d", abs(hours), abs(minutes), abs(seconds));
    string sign = "";
    if( hours < 0 || minutes < 0 || seconds < 0 )
	sign = "-";
    return sign + string(cstr);
}

Clock& Clock::operator+=(const Clock& rhs)
{
    setClock( hours   + rhs.hours,
	      minutes + rhs.minutes,
	      seconds + rhs.seconds );
    return *this;
}

Clock& Clock::operator-=(const Clock& rhs)
{
    setClock( hours   - rhs.hours,
	      minutes - rhs.minutes,
	      seconds - rhs.seconds );
    return *this;
}

Clock Clock::operator+(const Clock& rhs) 
{
    Clock ret(*this);
    ret += rhs;
    return ret;
}

Clock Clock::operator-(const Clock& rhs)
{
    Clock ret(*this);
    ret -= rhs;
    return ret;
}


void Clock::setClock(int h, int m, int s)
{
    int secs = s + 60 * m + 60 * 60 * h;
    int smh[3] = { secs, 0, 0 };
    for( int i=0 ; i<2 ; ++i ) {
	if( smh[i] >= 60 ) {
	    smh[i+1] += smh[i] / 60;
	    smh[i]   %= 60;
	}
    }
    seconds = smh[0];
    minutes = smh[1];
    hours   = smh[2];
}
