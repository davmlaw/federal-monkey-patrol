// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Wed Jul 13 23:06:40 2005
// Last modified: Wed Jul 13 23:06:40 2005

#ifndef COMPARATOR_H
#define COMPARATOR_H

#include "game/mission/outcomes/condition.h"
#include "game/mission/gamestatistics.h"

namespace condition_space {

	/**
	 * Used to perform comparisons against gamestatistics.
	 * Will return isTrue when something happens, eg MONKEYS_KILLED > 5
	 */
	class Comparator : public Condition {
	public:
		Comparator(GameStatistics* gamestats,
			stats_t stat, const std::string& op, unsigned int val);
		virtual bool isTrue(void);
	private:
		GameStatistics* gamestats;
		stats_t stat;
		const std::string op;
		unsigned int val;
		// Explicitly disable compiler generated copy functions
		Comparator(const Comparator& rhs);
		Comparator& operator=(const Comparator& rhs);
	};

} // condition_space


#endif // COMPARATOR_H
