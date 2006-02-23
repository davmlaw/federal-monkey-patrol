// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sat Jul 16 15:50:17 2005
// Last modified: Sat Jul 16 15:50:17 2005

#ifndef IOUTCOMES_H
#define IOUTCOMES_H

class Mission;

/**
 * Interface for Outcomes.
 * Made so XML dependencies don't spread everywherre
 */
class IOutcomes {
public:
    IOutcomes() { };
    virtual ~IOutcomes() { };
    virtual void update(Mission* mission) = 0;
private:
    // Explicitly disable compiler generated copy functions
    IOutcomes(const IOutcomes& rhs);
    IOutcomes& operator=(const IOutcomes& rhs);
};

#endif // IOUTCOMES_H
