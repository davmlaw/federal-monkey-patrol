// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sat Jul  2 22:41:50 2005
// Last modified: Sat Jul  2 22:41:50 2005

#ifndef MISSIONBUILDER_H
#define MISSIONBUILDER_H

#include "game/mission/mission.h"
#include "util/xmlhelper.h"
#include <string>

/**
 * Builds mission from .xml file
 * @see Mission
 */
class MissionBuilder {
public:
    MissionBuilder(Mission* m, const std::string& name);
    ~MissionBuilder() { };
private:
    void buildStartConditions	(xmlNodePtr node);
    void buildClaw				(xmlNodePtr node);
    void buildConstraints		(xmlNodePtr node);
	void buildOutcomes			(xmlNodePtr node);

    // Explicitly disable compiler generated copy functions
    MissionBuilder(const MissionBuilder& rhs);
    MissionBuilder& operator=(const MissionBuilder& rhs);
    Mission* mission;
};

#endif // MISSIONBUILDER_H
