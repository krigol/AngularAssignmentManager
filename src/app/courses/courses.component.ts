import { Component, OnInit } from '@angular/core';

import { Course } from '../course';
import { CourseService } from '../course.service';

@Component({
  selector: 'app-courses',
  templateUrl: './courses.component.html',
  styleUrls: ['./courses.component.css']
})
export class CoursesComponent implements OnInit {
  courses: Course[];

  constructor(private courseService: CourseService) { }

  ngOnInit() {
    this.getCourses();
  }

  getCourses(): void {
    this.courseService.getCourses()
    .subscribe(courses => this.courses = courses);
  }

  add(name: string): void {
    name = name.trim();
    if (!name) { return; }
    this.courseService.addCourse({ name } as Course)
      .subscribe(course => {
        this.courses.push(course);
      });
  }

  delete(course: Course): void {
    this.courses = this.courses.filter(h => h !== course);
    this.courseService.deleteCourse(course).subscribe();
  }

}
