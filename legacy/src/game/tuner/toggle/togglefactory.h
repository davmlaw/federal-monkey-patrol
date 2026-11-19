// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Mon Oct  3 16:33:38 2005

#ifndef TOGGLEFACTORY_H
#define TOGGLEFACTORY_H

#include "game/tuner/toggle/toggle.h"
#include <map>

/**
 * Creates Toggles
 */
class ToggleFactory {
public:
    virtual ~ToggleFactory();
    static ToggleFactory& Instance();
    toggle_list_t getComponentList(std::string ComponentName);
protected:
    ToggleFactory();
private:
    typedef std::map<std::string,toggle_list_t> toggle_list_map_t;
    toggle_list_map_t toggleComponents;
    // Explicitly disable compiler generated copy functions
    ToggleFactory(const ToggleFactory& rhs);
    ToggleFactory& operator=(const ToggleFactory& rhs);
};


#endif // TOGGLEFACTORY_H
