// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Thu Feb 10 01:31:09 2005
// Last modified: Thu Feb 10 01:31:09 2005

#ifndef TOGGLELIST
#define TOGGLELIST

#include "game/tuner/toggle/toggle.h"
#include "util/string_util.h"
#include <vector>

/**
 * User can pick from a selection of values
 */
class ToggleList : public Toggle {
public:
    ToggleList(const strings_t& args);
    virtual ~ToggleList() { };
    virtual float getMin(void) { return 0.0f; };
    virtual float getMax(void) { return (float)(values.size() - 1); };
    virtual float getPos(void) { return (float)i; };
    virtual std::string getTextValue(void);
    virtual void setTextValue(const std::string& val);
protected:
    virtual void setPos(float v) { i = (int)v; };
private:
    strings_t values;
    int i;
};

#endif // TOGGLELIST
