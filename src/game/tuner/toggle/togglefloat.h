// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Thu Mar 10 23:25:47 2005
// Last modified: Thu Mar 10 23:25:47 2005

#ifndef TOGGLEFLOAT
#define TOGGLEFLOAT

#include "game/tuner/toggle/toggle.h"

/**
 * User can change values from Min <-> Max
 */
class ToggleFloat : public Toggle {
public:
    ToggleFloat(float min, float max, float mod=1.0f);
    virtual ~ToggleFloat() { };
    virtual float getMin(void) { return min; };
    virtual float getMax(void) { return max; };
    virtual float getPos(void) { return value; };
    virtual std::string getTextValue(void);
    virtual void setTextValue(const std::string& val);
protected:
    virtual void setPos(float v) { value = v; };
    virtual float getModifier(void) { return modifier; };
private:
    float min;
    float max;
    float value;
    float modifier;
};


#endif // TOGGLEFLOAT
