// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Thu Feb 10 01:06:37 2005
// Last modified: Thu Feb 10 01:06:37 2005

#ifndef TOGGLE
#define TOGGLE

#include <string>
#include <list>
#include "game/tuner/menu/menuitem.h"
#include "util/settings.h"
#include "util/util.h"

/**
 * A MenuItem that can be altered through user input
 */
class Toggle : public MenuItem {
public:
    Toggle(void): settings(0) { };
    virtual ~Toggle() { };
    void setLabel(const std::string& l) {
	label = l;
    };
    std::string getLabel(void) {
	return label;
    };
    float getRange(void) {
	return getMax() - getMin();
    };
    void right(void) {
	setClampedPos( getPos() + getModifier() );
    }
    void left(void) {
	setClampedPos( getPos() - getModifier() );
    };
    void trigger(void) { /* empty */ };
    void linkTo(Settings* s, const std::string& p, const std::string k) {
	settings = s;
	parent = p;
	key = k;
	setTextValue( settings->get(parent, key) );
    };
    virtual float getMin(void) = 0;
    virtual float getMax(void) = 0;
    virtual float getPos(void) = 0;
    virtual std::string getTextValue(void) = 0;
    virtual void setTextValue(const std::string& val) = 0;
protected:
    virtual float getModifier(void) { return 1; }; // seems ok as default...
    virtual void setPos(float v) = 0;
    void setClampedPos(float v) {
	setPos( clamp(getMin(), v, getMax()) );
	if( settings ) {
	    settings->set(parent, key, getTextValue());
	}
    };
private:
    std::string label;
    Settings* settings;
    std::string parent;
    std::string key;
};

typedef std::list<Toggle*> toggle_list_t;

#endif // TOGGLE
