// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Mon Jul  4 23:00:41 2005
// Last modified: Mon Jul  4 23:00:41 2005

#ifndef OUTCOMES_H
#define OUTCOMES_H

#include "game/mission/outcomes/ioutcomes.h"
#include "game/mission/outcomes/scenario.h"
#include "util/xmlhelper.h"

/**
 * Runs scenarios
 */
class Outcomes : public IOutcomes {
public:
    Outcomes(xmlNodePtr node);
    virtual ~Outcomes();
    virtual void update(Mission* mission);
private:
    scenario_list_t scenarios;
    // Explicitly disable compiler generated copy functions
    Outcomes(const Outcomes& rhs);
    Outcomes& operator=(const Outcomes& rhs);
};

#endif // OUTCOMES_H
