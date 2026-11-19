// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Thu Feb 10 01:12:52 2005
// Last modified: Thu Feb 10 01:12:52 2005

#ifndef TOGGLESWITCH
#define TOGGLESWITCH

#include "game/tuner/toggle/toggle.h"

/**
 * Boolean toggle
 */
class ToggleSwitch : public Toggle {
public:
    ToggleSwitch();
    virtual ~ToggleSwitch() { };
    virtual float getMin(void) { return (float)MIN; };
    virtual float getMax(void) { return (float)MAX; };
    virtual float getPos(void) { return (float)value; };
    virtual std::string getTextValue(void);
    virtual void setTextValue(const std::string& val);
protected:
    virtual void setPos(float v) { value = (int)v; };
private:
    static const int MIN;
    static const int MAX;
    std::string text[2];
    int value;
    int modifier;
};

#endif // TOGGLESWITCH
