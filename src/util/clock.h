// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Mon Oct 10 11:42:00 2005

#ifndef CLOCK_H
#define CLOCK_H

#include <string>

/**
 * "12:42:01" style clock
 */
class Clock {
public:
    Clock(int s);
    Clock(int m, int s);
    Clock(int h, int m, int s);
    virtual ~Clock() { };
    std::string toString();
    Clock& operator+=(const Clock& rhs);
    Clock& operator-=(const Clock& rhs);
    Clock operator+(const Clock& rhs);
    Clock operator-(const Clock& rhs);
private:
    void setClock(int h, int m, int s);
    int seconds;
    int minutes;
    int hours;
};

#endif // CLOCK_H
