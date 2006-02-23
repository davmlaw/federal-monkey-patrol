// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Thu Feb 10 01:12:52 2005
// Last modified: Thu Feb 10 01:12:52 2005

#include "toggleswitch.h"

using namespace std;

const int ToggleSwitch::MIN = 0;
const int ToggleSwitch::MAX = 1;

ToggleSwitch::ToggleSwitch()
{
    setLabel("Switch");
    text[0] = "Off";
    text[1] = "On";
    value = 0;
}


string ToggleSwitch::getTextValue(void)
{
    return text[value];
}


void ToggleSwitch::setTextValue(const std::string& val)
{
    value = stringToBool(val);
}
