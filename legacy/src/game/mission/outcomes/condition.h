// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Tue Jul  5 00:18:37 2005
// Last modified: Tue Jul  5 00:18:37 2005

#ifndef CONDITION_H
#define CONDITION_H

#include "util/xmlhelper.h"
#include <list>

// Putting this in namespace, as likely True/Not/And names are taken
// Someone has brain damage and/or Apache-Ant Disease
namespace condition_space {

	/**
	 * Boolean condition.
	 * Used by scenario as follows:
	 * if( Condition->isTrue() )
	 *     Result->execute()
	 * @see Scenario
	 * @see Result
	 */
	class Condition {
	public:
		Condition() { };
		virtual ~Condition() { };
		virtual bool isTrue(void) = 0;
	private:
		// Explicitly disable compiler generated copy functions
		Condition(const Condition& rhs);
		Condition& operator=(const Condition& rhs);
	};

	typedef std::list<Condition*> condition_list_t;

	// Builder
	Condition* ConditionBuilder(xmlNodePtr node);

	// UNARY
	class True : public Condition {
	public:
		bool isTrue(void) {  return true; };
	};

	class Not : public Condition {
	public:
		Not(Condition* c);
		virtual ~Not();
		bool isTrue(void);
	private:
		Condition* child;
		// Explicitly disable compiler generated copy functions
		Not(const Not& rhs);
		Not& operator=(const Not& rhs);
	};

	/**
	 * N-Ary condition, ie multiple arguments
	 */
	class NAryCondition : public Condition {
	public:
		NAryCondition() { };
		NAryCondition(const condition_list_t& clist): conditions(clist) { };
		virtual ~NAryCondition();
		virtual bool isTrue(void) = 0;
		virtual void add(Condition* c);
	protected:
		condition_list_t conditions;
		// Explicitly disable compiler generated copy functions
		NAryCondition(const NAryCondition& rhs);
		NAryCondition& operator=(const NAryCondition& rhs);
	};


	class And : public NAryCondition {
	public:
		And() { };
		And(const condition_list_t& clist): NAryCondition(clist) { };
		virtual ~And() { };
		bool isTrue(void);
	private:
		// Explicitly disable compiler generated copy functions
		And(const And& rhs);
		And& operator=(const And& rhs);
	};


	class Or : public NAryCondition {
	public:
		Or() { };
		Or(const condition_list_t& clist): NAryCondition(clist) { };
		virtual ~Or() { };
		bool isTrue(void);
	private:
		// Explicitly disable compiler generated copy functions
		Or(const Or& rhs);
		Or& operator=(const Or& rhs);
	};

} // namespace condition_space




#endif // CONDITION_H
