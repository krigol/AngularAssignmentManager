'use strict'; // necessary for es6 output in node

import { browser, element, by, ElementFinder, ElementArrayFinder } from 'protractor';
import { promise } from 'selenium-webdriver';

const expectedH1 = 'Tour of Courses';
const expectedTitle = `${expectedH1}`;
const targetCourse = { id: 15, name: 'Magneta' };
const targetCourseDashboardIndex = 3;
const nameSuffix = 'X';
const newCourseName = targetCourse.name + nameSuffix;

class Course {
  id: number;
  name: string;

  // Factory methods

  // Course from string formatted as '<id> <name>'.
  static fromString(s: string): Course {
    return {
      id: +s.substr(0, s.indexOf(' ')),
      name: s.substr(s.indexOf(' ') + 1),
    };
  }

  // Course from course list <li> element.
  static async fromLi(li: ElementFinder): Promise<Course> {
      let stringsFromA = await li.all(by.css('a')).getText();
      let strings = stringsFromA[0].split(' ');
      return { id: +strings[0], name: strings[1] };
  }

  // Course id and name from the given detail element.
  static async fromDetail(detail: ElementFinder): Promise<Course> {
    // Get course id from the first <div>
    let _id = await detail.all(by.css('div')).first().getText();
    // Get name from the h2
    let _name = await detail.element(by.css('h2')).getText();
    return {
        id: +_id.substr(_id.indexOf(' ') + 1),
        name: _name.substr(0, _name.lastIndexOf(' '))
    };
  }
}

describe('Tutorial part 6', () => {

  beforeAll(() => browser.get(''));

  function getPageElts() {
    let navElts = element.all(by.css('app-root nav a'));

    return {
      navElts: navElts,

      appDashboardHref: navElts.get(0),
      appDashboard: element(by.css('app-root app-dashboard')),
      topCourses: element.all(by.css('app-root app-dashboard > div h4')),

      appCoursesHref: navElts.get(1),
      appCourses: element(by.css('app-root app-courses')),
      allCourses: element.all(by.css('app-root app-courses li')),
      selectedCourseSubview: element(by.css('app-root app-courses > div:last-child')),

      courseDetail: element(by.css('app-root app-course-detail > div')),

      searchBox: element(by.css('#search-box')),
      searchResults: element.all(by.css('.search-result li'))
    };
  }

  describe('Initial page', () => {

    it(`has title '${expectedTitle}'`, () => {
      expect(browser.getTitle()).toEqual(expectedTitle);
    });

    it(`has h1 '${expectedH1}'`, () => {
        expectHeading(1, expectedH1);
    });

    const expectedViewNames = ['Dashboard', 'Courses'];
    it(`has views ${expectedViewNames}`, () => {
      let viewNames = getPageElts().navElts.map((el: ElementFinder) => el.getText());
      expect(viewNames).toEqual(expectedViewNames);
    });

    it('has dashboard as the active view', () => {
      let page = getPageElts();
      expect(page.appDashboard.isPresent()).toBeTruthy();
    });

  });

  describe('Dashboard tests', () => {

    beforeAll(() => browser.get(''));

    it('has top courses', () => {
      let page = getPageElts();
      expect(page.topCourses.count()).toEqual(4);
    });

    it(`selects and routes to ${targetCourse.name} details`, dashboardSelectTargetCourse);

    it(`updates course name (${newCourseName}) in details view`, updateCourseNameInDetailView);

    it(`cancels and shows ${targetCourse.name} in Dashboard`, () => {
      element(by.buttonText('go back')).click();
      browser.waitForAngular(); // seems necessary to gets tests to pass for toh-pt6

      let targetCourseElt = getPageElts().topCourses.get(targetCourseDashboardIndex);
      expect(targetCourseElt.getText()).toEqual(targetCourse.name);
    });

    it(`selects and routes to ${targetCourse.name} details`, dashboardSelectTargetCourse);

    it(`updates course name (${newCourseName}) in details view`, updateCourseNameInDetailView);

    it(`saves and shows ${newCourseName} in Dashboard`, () => {
      element(by.buttonText('save')).click();
      browser.waitForAngular(); // seems necessary to gets tests to pass for toh-pt6

      let targetCourseElt = getPageElts().topCourses.get(targetCourseDashboardIndex);
      expect(targetCourseElt.getText()).toEqual(newCourseName);
    });

  });

  describe('Courses tests', () => {

    beforeAll(() => browser.get(''));

    it('can switch to Courses view', () => {
      getPageElts().appCoursesHref.click();
      let page = getPageElts();
      expect(page.appCourses.isPresent()).toBeTruthy();
      expect(page.allCourses.count()).toEqual(10, 'number of courses');
    });

    it('can route to course details', async () => {
      getCourseLiEltById(targetCourse.id).click();

      let page = getPageElts();
      expect(page.courseDetail.isPresent()).toBeTruthy('shows course detail');
      let course = await Course.fromDetail(page.courseDetail);
      expect(course.id).toEqual(targetCourse.id);
      expect(course.name).toEqual(targetCourse.name.toUpperCase());
    });

    it(`updates course name (${newCourseName}) in details view`, updateCourseNameInDetailView);

    it(`shows ${newCourseName} in Courses list`, () => {
      element(by.buttonText('save')).click();
      browser.waitForAngular();
      let expectedText = `${targetCourse.id} ${newCourseName}`;
      expect(getCourseAEltById(targetCourse.id).getText()).toEqual(expectedText);
    });

    it(`deletes ${newCourseName} from Courses list`, async () => {
      const coursesBefore = await toCourseArray(getPageElts().allCourses);
      const li = getCourseLiEltById(targetCourse.id);
      li.element(by.buttonText('x')).click();

      const page = getPageElts();
      expect(page.appCourses.isPresent()).toBeTruthy();
      expect(page.allCourses.count()).toEqual(9, 'number of courses');
      const coursesAfter = await toCourseArray(page.allCourses);
      // console.log(await Course.fromLi(page.allCourses[0]));
      const expectedCourses =  coursesBefore.filter(h => h.name !== newCourseName);
      expect(coursesAfter).toEqual(expectedCourses);
      // expect(page.selectedCourseSubview.isPresent()).toBeFalsy();
    });

    it(`adds back ${targetCourse.name}`, async () => {
      const newCourseName = 'Alice';
      const coursesBefore = await toCourseArray(getPageElts().allCourses);
      const numCourses = coursesBefore.length;

      element(by.css('input')).sendKeys(newCourseName);
      element(by.buttonText('add')).click();

      let page = getPageElts();
      let coursesAfter = await toCourseArray(page.allCourses);
      expect(coursesAfter.length).toEqual(numCourses + 1, 'number of courses');

      expect(coursesAfter.slice(0, numCourses)).toEqual(coursesBefore, 'Old courses are still there');

      const maxId = coursesBefore[coursesBefore.length - 1].id;
      expect(coursesAfter[numCourses]).toEqual({id: maxId + 1, name: newCourseName});
    });

    it('displays correctly styled buttons', async () => {
      element.all(by.buttonText('x')).then(buttons => {
        for (const button of buttons) {
          // Inherited styles from styles.css
          expect(button.getCssValue('font-family')).toBe('Arial');
          expect(button.getCssValue('border')).toContain('none');
          expect(button.getCssValue('padding')).toBe('5px 10px');
          expect(button.getCssValue('border-radius')).toBe('4px');
          // Styles defined in courses.component.css
          expect(button.getCssValue('left')).toBe('194px');
          expect(button.getCssValue('top')).toBe('-32px');
        }
      });

      const addButton = element(by.buttonText('add'));
      // Inherited styles from styles.css
      expect(addButton.getCssValue('font-family')).toBe('Arial');
      expect(addButton.getCssValue('border')).toContain('none');
      expect(addButton.getCssValue('padding')).toBe('5px 10px');
      expect(addButton.getCssValue('border-radius')).toBe('4px');
    });

  });

  describe('Progressive course search', () => {

    beforeAll(() => browser.get(''));

    it(`searches for 'Ma'`, async () => {
      getPageElts().searchBox.sendKeys('Ma');
      browser.sleep(1000);

      expect(getPageElts().searchResults.count()).toBe(4);
    });

    it(`continues search with 'g'`, async () => {
      getPageElts().searchBox.sendKeys('g');
      browser.sleep(1000);
      expect(getPageElts().searchResults.count()).toBe(2);
    });

    it(`continues search with 'e' and gets ${targetCourse.name}`, async () => {
      getPageElts().searchBox.sendKeys('n');
      browser.sleep(1000);
      let page = getPageElts();
      expect(page.searchResults.count()).toBe(1);
      let course = page.searchResults.get(0);
      expect(course.getText()).toEqual(targetCourse.name);
    });

    it(`navigates to ${targetCourse.name} details view`, async () => {
      let course = getPageElts().searchResults.get(0);
      expect(course.getText()).toEqual(targetCourse.name);
      course.click();

      let page = getPageElts();
      expect(page.courseDetail.isPresent()).toBeTruthy('shows course detail');
      let course2 = await Course.fromDetail(page.courseDetail);
      expect(course2.id).toEqual(targetCourse.id);
      expect(course2.name).toEqual(targetCourse.name.toUpperCase());
    });
  });

  async function dashboardSelectTargetCourse() {
    let targetCourseElt = getPageElts().topCourses.get(targetCourseDashboardIndex);
    expect(targetCourseElt.getText()).toEqual(targetCourse.name);
    targetCourseElt.click();
    browser.waitForAngular(); // seems necessary to gets tests to pass for toh-pt6

    let page = getPageElts();
    expect(page.courseDetail.isPresent()).toBeTruthy('shows course detail');
    let course = await Course.fromDetail(page.courseDetail);
    expect(course.id).toEqual(targetCourse.id);
    expect(course.name).toEqual(targetCourse.name.toUpperCase());
  }

  async function updateCourseNameInDetailView() {
    // Assumes that the current view is the course details view.
    addToCourseName(nameSuffix);

    let page = getPageElts();
    let course = await Course.fromDetail(page.courseDetail);
    expect(course.id).toEqual(targetCourse.id);
    expect(course.name).toEqual(newCourseName.toUpperCase());
  }

});

function addToCourseName(text: string): promise.Promise<void> {
  let input = element(by.css('input'));
  return input.sendKeys(text);
}

function expectHeading(hLevel: number, expectedText: string): void {
    let hTag = `h${hLevel}`;
    let hText = element(by.css(hTag)).getText();
    expect(hText).toEqual(expectedText, hTag);
};

function getCourseAEltById(id: number): ElementFinder {
  let spanForId = element(by.cssContainingText('li span.badge', id.toString()));
  return spanForId.element(by.xpath('..'));
}

function getCourseLiEltById(id: number): ElementFinder {
  let spanForId = element(by.cssContainingText('li span.badge', id.toString()));
  return spanForId.element(by.xpath('../..'));
}

async function toCourseArray(allCourses: ElementArrayFinder): Promise<Course[]> {
  let promisedCourses = await allCourses.map(Course.fromLi);
  // The cast is necessary to get around issuing with the signature of Promise.all()
  return <Promise<any>> Promise.all(promisedCourses);
}
